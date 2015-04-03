#To-Do List

* Better progress feedback.
* Optionally init column toggling only once column button is clicked. Shouldn't make much difference for small tables, and would save needless high processor usage on large tables.
* Complete README file
* Dim table w/ opacity change while toggling? Would give visual feedback during slow toggle (> ~200ms) on large tables, and it's a relatively inexpensive style change in terms of rendering impact.
* "refresh" method to re-init cells by column without rebuilding and re-placing toggle menu. Useful for tables that have been rebuilt due to some ajax operation, but still have the same columns.
* Add a way (data attribute?) to associate a toolbar with a specific enhanced table. The toolbar will always be the next or previous sibling of the positioning target (the table by default), but something more explicit may be a nice-to-have.
* table search/filter, if it can be made fast enough