#To-Do List

* If user clicks menu button before init is complete, the drop-down will display a progress meter until this is hidden and checkbox list populated. Alternately, the menu button itself becomes a progress bar by starting disabled, filling with green from left to right, then having the green fade and getting enabled after table processing is complete.
  * Init column toggling only once column button is clicked? Shouldn't make much difference for small tables, and would save needless high processor usage on large tables.
* Complete README file
* Dim table w/ opacity change while toggling? Would give visual feedback during slow toggle (> ~200ms) on large tables, and it's a relatively inexpensive style change in terms of rendering impact.
* "refresh" method to re-init cells by column without rebuilding and re-placing toggle menu. Useful for tables that have been rebuilt due to some ajax operation, but still have the same columns.
* Add a way (data attribute?) to associate a toolbar with a specific enhanced table. The toolbar will always be the next or previous sibling of the positioning target (the table by default), but something more explicit may be a nice-to-have.
* table search/filter, if it can be made fast enough