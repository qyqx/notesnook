/*
This file is part of the Notesnook project (https://notesnook.com/)

Copyright (C) 2023 Streetwriters (Private) Limited

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import createStore from "../common/store";
import { store as noteStore } from "./note-store";
import { store as attachmentStore } from "./attachment-store";
import { store as appStore } from "./app-store";
import { store as settingStore } from "./setting-store";
import { db } from "../common/db";
import BaseStore from ".";
import { EV, EVENTS } from "@notesnook/core/dist/common";
import { hashNavigate } from "../navigation";
import { logger } from "../utils/logger";
import Config from "../utils/config";
import { setDocumentTitle } from "../utils/dom";
import { Note, Tag } from "@notesnook/core";
import { NoteContent } from "@notesnook/core/dist/collections/session-content";
import { Context } from "../components/list-container/types";

enum SaveState {
  NotSaved = -1,
  Saving = 0,
  Saved = 1
}
enum SESSION_STATES {
  stale = "stale",
  new = "new",
  locked = "locked",
  unlocked = "unlocked",
  opening = "opening"
}

type EditorSession = {
  sessionType: "default" | "locked";
  content?: NoteContent<false>;
  isDeleted: boolean;
  attachmentsLength: number;
  saveState: SaveState;
  sessionId: string;
  state: SESSION_STATES;
  context?: Context;
  nonce?: string;
} & Partial<Note>;

export const getDefaultSession = (sessionId?: string): EditorSession => {
  return {
    sessionType: "default",
    state: SESSION_STATES.new,
    saveState: SaveState.Saved, // -1 = not saved, 0 = saving, 1 = saved
    sessionId: sessionId || Date.now().toString(),
    attachmentsLength: 0,
    isDeleted: false
  };
};

class EditorStore extends BaseStore<EditorStore> {
  session = getDefaultSession();
  tags: Tag[] = [];
  color = undefined;
  arePropertiesVisible = false;
  editorMargins = Config.get("editor:margins", true);

  init = () => {
    EV.subscribe(EVENTS.userLoggedOut, () => {
      hashNavigate("/notes/create", { replace: true, addNonce: true });
    });

    EV.subscribe(EVENTS.vaultLocked, () => {
      const { id, locked } = this.get().session;
      if (locked) hashNavigate(`/notes/${id}/unlock`, { replace: true });
    });
  };

  refreshTags = async () => {
    const { session } = this.get();
    if (!session.id) return;
    this.set({
      tags: await db.relations
        .to({ id: session.id, type: "note" }, "tag")
        .resolve()
    });
  };

  async refresh() {
    const sessionId = this.get().session.id;
    if (sessionId && !db.notes.note(sessionId)) await this.clearSession();
  }

  updateSession = async (item: Note) => {
    this.set((state) => {
      state.session.title = item.title;
      state.session.pinned = item.pinned;
      state.session.favorite = item.favorite;
      state.session.readonly = item.readonly;
      state.session.dateEdited = item.dateEdited;
      state.session.dateCreated = item.dateCreated;
      state.session.locked = item.locked;
    });
    this.refreshTags();
  };

  openLockedSession = async (note: Note) => {
    this.set((state) => {
      state.session = {
        ...getDefaultSession(note.dateEdited.toString()),
        ...note,
        sessionType: "locked",
        id: undefined, // NOTE: we give a session id only after the note is opened.
        state: SESSION_STATES.unlocked
      };
    });
    appStore.setIsEditorOpen(true);
    hashNavigate(`/notes/${note.id}/edit`, { replace: true });
  };

  openSession = async (noteId: string, force = false) => {
    const session = this.get().session;

    if (session.id) await db.fs().cancel(session.id, "download");
    if (session.id === noteId && !force) return;

    if (session.state === SESSION_STATES.unlocked) {
      this.set((state) => {
        state.session.id = noteId;
        state.session.state = SESSION_STATES.new;
      });
      return;
    }

    const note = await db.notes.note(noteId); // TODO: || db.notes.trashed(noteId);
    if (!note) return;

    noteStore.setSelectedNote(note.id);
    setDocumentTitle(settingStore.get().hideNoteTitle ? undefined : note.title);

    if (note.locked)
      return hashNavigate(`/notes/${noteId}/unlock`, { replace: true });
    if (note.conflicted)
      return hashNavigate(`/notes/${noteId}/conflict`, { replace: true });

    const content = note.contentId
      ? await db.content.get(note.contentId)
      : undefined;
    if (content && content.locked)
      return hashNavigate(`/notes/${noteId}/unlock`, { replace: true });

    this.set((state) => {
      const defaultSession = getDefaultSession(note.dateEdited.toString());
      state.session = {
        ...defaultSession,
        ...note,
        content,
        state: SESSION_STATES.new,
        attachmentsLength: 0 // TODO: db.attachments.ofNote(note.id, "all")?.length || 0
      };

      // TODO: const isDeleted = note.type === "trash";
      // if (isDeleted) {
      //   state.session.isDeleted = true;
      //   state.session.readonly = true;
      // }
    });
    appStore.setIsEditorOpen(true);
    this.toggleProperties(false);
  };

  saveSession = async (
    sessionId: string | undefined,
    session: Partial<EditorSession>
  ) => {
    if (!session) {
      logger.warn("Session cannot be undefined", { sessionId, session });
      return;
    }

    const currentSession = this.get().session;
    if (currentSession.readonly && session.readonly !== false) return; // do not allow saving of readonly session
    if (currentSession.saveState === 0 || currentSession.id !== sessionId)
      return;

    this.setSaveState(0);
    try {
      if (session.content) this.get().session.content = session.content;

      const id =
        currentSession.locked && sessionId
          ? await db.vault.save({ ...session, id: sessionId })
          : await db.notes.add({ ...session, id: sessionId });

      if (currentSession && currentSession.id !== sessionId) {
        noteStore.refresh();
        throw new Error("Aborting save operation: old session.");
      }
      if (!id) throw new Error("Note not saved.");

      // let note = await db.notes.note(id);
      // if (!note) throw new Error("Note not saved.");

      if (!sessionId) {
        noteStore.setSelectedNote(id);
        hashNavigate(`/notes/${id}/edit`, { replace: true, notify: false });
      }

      const defaultNotebook = db.settings.getDefaultNotebook();
      if (currentSession.context) {
        const { type } = currentSession.context;
        if (type === "notebook")
          await db.notes.addToNotebook(currentSession.context.id, id);
        else if (type === "color" || type === "tag")
          await db.relations.add(
            { type, id: currentSession.context.id },
            { id, type: "note" }
          );
      } else if (!sessionId && defaultNotebook) {
        await db.notes.addToNotebook(defaultNotebook, id);
      }

      console.log("getting note");
      const note = await db.notes.note(id);
      if (!note) throw new Error("Note not saved.");

      const shouldRefreshNotes =
        currentSession.context ||
        !sessionId ||
        note.title !== currentSession.title ||
        note.headline !== currentSession.headline;
      if (shouldRefreshNotes) noteStore.refresh();

      const attachments = await db.attachments.ofNote(id, "all");
      if (attachments.length !== currentSession.attachmentsLength) {
        attachmentStore.refresh();
      }

      this.set((state) => {
        if (!!state.session.id && state.session.id !== note.id) return;

        for (const key in session) {
          if (key === "content") continue;
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          state.session[key] = session[key as keyof EditorSession];
        }

        state.session.context = undefined;
        state.session.id = note.id;
        state.session.title = note.title;
        state.session.dateEdited = note.dateEdited;
        state.session.attachmentsLength = attachments.length;
      });
      setDocumentTitle(
        settingStore.get().hideNoteTitle ? undefined : note.title
      );

      this.setSaveState(1);
    } catch (err) {
      this.setSaveState(-1);
      console.error(err);
      if (err instanceof Error) logger.error(err);
      if (currentSession.locked) {
        hashNavigate(`/notes/${session.id}/unlock`, { replace: true });
      }
    }
  };

  newSession = async (nonce?: string) => {
    const context = noteStore.get().context;
    const session = this.get().session;
    if (session.id) await db.fs().cancel(session.id, "download");

    this.set((state) => {
      state.session = {
        ...getDefaultSession(),
        context,
        nonce,
        state: SESSION_STATES.new
      };
    });
    noteStore.setSelectedNote();
    appStore.setIsEditorOpen(true);
    setDocumentTitle();
  };

  clearSession = async (shouldNavigate = true) => {
    const session = this.get().session;
    if (session.id) await db.fs().cancel(session.id, "download");

    this.set((state) => {
      state.session = {
        ...getDefaultSession(),
        state: SESSION_STATES.new
      };
    });
    noteStore.setSelectedNote();
    this.toggleProperties(false);
    if (shouldNavigate)
      hashNavigate(`/notes/create`, { replace: true, addNonce: true });
    setTimeout(() => appStore.setIsEditorOpen(false), 100);
    setDocumentTitle();
  };

  setTitle = (noteId: string | undefined, title: string) => {
    return this.saveSession(noteId, { title });
  };

  toggle = (
    noteId: string,
    name: "favorite" | "pinned" | "readonly" | "localOnly" | "color",
    value: boolean | string
  ) => {
    return this.saveSession(noteId, { [name]: value });
  };

  saveSessionContent = (
    noteId: string | undefined,
    sessionId: string,
    content: NoteContent<false>
  ) => {
    return this.saveSession(noteId, { sessionId, content });
  };

  setTag = (tag: string) => {
    return this._setTag(tag);
  };

  setSaveState = (saveState: SaveState) => {
    this.set((state) => {
      state.session.saveState = saveState;
    });
  };

  toggleProperties = (toggleState: boolean) => {
    this.set(
      (state) =>
        (state.arePropertiesVisible =
          toggleState !== undefined ? toggleState : !state.arePropertiesVisible)
    );
  };

  toggleEditorMargins = (toggleState: boolean) => {
    this.set((state) => {
      state.editorMargins =
        toggleState !== undefined ? toggleState : !state.editorMargins;
      Config.set("editor:margins", state.editorMargins);
    });
  };

  // _getSaveFn = () => {
  //   return this.get().session.locked
  //     ? db.vault.save.bind(db.vault)
  //     : db.notes.add.bind(db.notes);
  // };

  async _setTag(value: string) {
    // const {
    //   tags,
    //   session: { id }
    // } = this.get();
    // let note = db.notes.note(id);
    // if (!note) return;
    // let tag = tags.find((t) => t.title === value);
    // if (tag) {
    //   await db.relations.unlink(tag, note._note);
    //   appStore.refreshNavItems();
    // } else {
    //   const id = await db.tags.add({ title: value });
    //   await db.relations.add({ id, type: "tag" }, note._note);
    // }
    // this.refreshTags();
    // tagStore.refresh();
    // noteStore.refresh();
  }
}

const [useStore, store] = createStore(EditorStore);
export { useStore, store, SESSION_STATES };