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

import { Box } from "@theme-ui/components";
import Dialog from "../components/dialog";
import Field from "../components/field";

function ItemDialog(props) {
  return (
    <Dialog
      testId="item-dialog"
      isOpen={true}
      title={props.title}
      description={props.subtitle}
      positiveButton={{
        form: "itemForm",
        type: "submit",
        text: props.title
      }}
      onClose={() => props.onClose(false)}
      negativeButton={{ text: "Cancel", onClick: () => props.onClose(false) }}
    >
      <Box
        as="form"
        id="itemForm"
        onSubmit={(e) => {
          e.preventDefault();
          const title = e.target.title.value;
          props.onAction(title);
        }}
      >
        <Field
          required
          label="Title"
          id="title"
          name="title"
          autoFocus
          data-test-id="title-input"
          defaultValue={props.defaultValue}
        />
      </Box>
    </Dialog>
  );
}

export default ItemDialog;
