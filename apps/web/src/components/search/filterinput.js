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
import { useEffect, forwardRef } from "react";
import { hexToRGB } from "../../utils/color";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./datepicker.css";
import { filterSearchEngine } from "./search";
import { Text } from "@theme-ui/components";
import { mainSearchEngine } from "./search";

export function FilterInput(props) {
  const {
    filters,
    focusInput,
    index,
    setFilters,
    item,
    getSuggestions,
    setSuggestions,
    onFocus,
    onBlur
  } = props;

  useEffect(() => {
    focusInput(filters.length - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.length]);

  const setCalenderState = (state) => {
    setFilters((filters) => {
      let inputs = [...filters];
      inputs[index].input.isCalenderOpen = state;
      return inputs;
    });
  };

  const setCalenderDate = () => {
    document.getElementById(`inputId_${index}`).innerText =
      filters[index].input.date.formatted;
  };
  return !item.input.isDateFilter ? (
    <CustomInput
      {...props}
      id={`inputId_${index}`}
      bg={item.input.state.error ? "errorBg" : hexToRGB("#9E9E9E", 0.1)}
      onFocus={async (e) => {
        await checkErrors(props, e.target.innerText);
        setSuggestions(await getSuggestions(e.target.innerText, item.input));
        onFocus(e);
      }}
      onBlur={onBlur}
      onKeyDown={async (e) => {
        (await onKeyPress(e, props))[e.key]();
      }}
    />
  ) : (
    <DatePicker
      {...props}
      customInput={<CustomInput />}
      peekNextMonth
      showMonthDropdown
      showYearDropdown
      dropdownMode="select"
      id={`inputId_${index}`}
      selected={filters[index].input.date.orignal}
      onCalendarClose={() => {
        setCalenderDate();
        document.getElementById(`inputId_${index}`).focus();
      }}
      onCalendarOpen={() => {
        setCalenderDate();
      }}
      onChange={(date) => {
        let inputs = [...filters];
        inputs[index].input.date.formatted = `${date.getDate()}/${
          date.getMonth() + 1
        }/${date.getFullYear()}`;
        inputs[index].input.date.orignal = date;
        setFilters(inputs);
      }}
      onBlur={(e) => {
        setCalenderState(false);
        onBlur(e);
      }}
      onFocus={async (e) => {
        setCalenderState(true);
        setSuggestions(await getSuggestions(e.target.innerText, item.input));
        onFocus(e);
      }}
      onKeyDown={async (e) => {
        (await onKeyPress(e, props))[e.key]();
      }}
    />
  );
}

const CustomInput = forwardRef((props, refs) => (
  <Text
    ref={refs}
    tabIndex={0}
    as="span"
    contentEditable="true"
    type="text"
    sx={{
      width: "10%",
      py: "2.5px",
      px: "6px",
      fontSize: "input",
      flexShrink: 0,
      flexGrow: 1,
      boxShadow: "none",
      outline: "none",
      ":focus": {
        boxShadow: "none",
        border: "none"
      },
      ":hover:not(:focus)": {
        boxShadow: "none"
      }
    }}
    {...props}
  />
));
CustomInput.displayName = "CustomInput";

const getCursorPosition = (editableDiv) => {
  //it is a general method, it should be somehwre else
  var caretPos = 0,
    sel,
    range;
  if (window.getSelection) {
    sel = window.getSelection();
    if (sel.rangeCount) {
      range = sel.getRangeAt(0);
      if (range.commonAncestorContainer.parentNode == editableDiv) {
        caretPos = range.endOffset;
      }
    }
  } else if (document.selection && document.selection.createRange) {
    range = document.selection.createRange();
    if (range.parentElement() == editableDiv) {
      var tempEl = document.createElement("span");
      editableDiv.insertBefore(tempEl, editableDiv.firstChild);
      var tempRange = range.duplicate();
      tempRange.moveToElementText(tempEl);
      tempRange.setEndPoint("EndToEnd", range);
      caretPos = tempRange.text.length;
    }
  }
  return caretPos;
};

const checkErrors = async (props, query) => {
  const { setFilters, index, item } = props;
  query = query.trim();
  let input = item.input;
  let result = await (await mainSearchEngine(input.type, query)).result;
  setFilters((filters) => {
    let _filters = [...filters];
    _filters[index].input.state = filterInputState(input, result, query);
    return _filters;
  });
};

const filterInputState = (input, result, query) => {
  console.log(
    "filterInputState",
    input.id,
    query,
    !input.hasSuggestions,
    result.length > 0
  );
  if (!input.hasSuggestions)
    return {
      error: false,
      message: "",
      result: { type: input.type, value: query }
    };

  if (result.length > 0)
    return { error: false, message: "", result: result[0] };

  return {
    error: true,
    message: `This ${input.type.replace(
      "s",
      ""
    )} is not present in the database.`,
    result: undefined
  };
};

const deleteDefinition = (definitions, id) => {
  let index = 0;
  for (let definition of definitions) {
    if (definition.srNo === id) {
      definitions.splice(index, 1);
    }
    index++;
  }
};

const deleteFilter = (advanceInputs, index) => {
  advanceInputs.splice(index, 1);
  return advanceInputs;
};

const onKeyPress = async (e, props) => {
  const {
    filters,
    focusInput,
    index,
    setFilters,
    item,
    getSuggestions,
    setSuggestions,
    onSearch,
    searchDefinitions,
    setSelectionIndex,
    suggestions,
    moveSelection
  } = props;
  setSuggestions(await getSuggestions(e.target.innerText, item.input));
  await checkErrors(props, e.target.innerText);
  return {
    Enter: async () => {
      props.onKeyDown(e);
      focusInput(index + 1);
      let results = await filterSearchEngine(searchDefinitions);
      onSearch(results);
      setSuggestions([]);
      e.preventDefault();
    },
    Escape: () => {
      setSuggestions([]);
    },
    ArrowDown: () => {
      moveSelection(suggestions, setSelectionIndex).Down();
      e.preventDefault();
    },
    ArrowUp: () => {
      moveSelection(suggestions, setSelectionIndex).Up();
      e.preventDefault();
    },
    ArrowLeft: () => {
      if (getCursorPosition(document.getElementById(e.target.id)) == 0) {
        focusInput(index - 1);
        e.preventDefault();
      }
    },
    ArrowRight: () => {
      if (
        getCursorPosition(document.getElementById(e.target.id)) ==
        e.target.innerText.length
      ) {
        focusInput(index + 1);
        e.preventDefault();
      }
    },
    Backspace: () => {
      if (e.target.innerText === "") {
        setSuggestions([]);
        setFilters(deleteFilter(filters, index));
        deleteDefinition(searchDefinitions, item.input.id);
        focusInput(index - 1);
      }
    }
  };
};