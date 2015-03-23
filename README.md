#Flexitable

This is a non-blocking column toggle plugin created because the existing solutions 
I found caused the browser to freeze up when used with very large tables.

A more complete read-me file with full instructions is coming soon(ish). Meanwhile,
feedback and bug reports are welcome.

##Important Notes

* In addition to user-chosen column toggling, this plugin lets you set certain
columns to automatically collapse at certain media query breakpoints. This is
done by setting `data-flexitable-priority-class` attribute on column headers to 
a space-separated list of classes that you want applied to all cells in that column.
Those classes then determine at what point the column is shown/hidden using CSS
media queries. You can create and apply classes of your own, but Flexitable comes
with these defaults ready to use:
  * *no class* -- Columns with no priority class set using the data attribute are hidden at viewport widths below 1024 pixels.
  * `optional` -- Columns using this priority class are visible at a viewport width of 768 pixels or higher.
  * `essential` -- Columns using this priority class are always visible at any viewport size.
  * `persist` -- Columns using this priority class are always visible and **and cannot be toggled off using the column menu.**
* If you want to use this plugin's responsive features in IE 8, you'll need [Respond.js](https://github.com/scottjehl/Respond).
* As part of the effort to avoid browser UI freeze, plugin initialization 
and destruction were made asynchronous. If you need to do something in your own 
code only after these actions are complete, listen on the enhanced table for the
`toggle-initialized.flexitable` and `toggle-destroyed.flexitable` events respectively.