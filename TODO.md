#To-Do List

 * Drop column toggle menu into page above table first. If user clicks menu button before init is complete, the drop-down will display a progress meter until this is hidden and checkbox list populated. Alternately, the menu button itself becomes a progress bar by starting disabled, filling with green from left to right, then having the green fade and getting enabled after table processing is complete.
 * Init column toggling only once column button is clicked? Shouldn't make much difference for small tables, and would save needless high processor usage on large tables.
 * "refresh" method to re-init cells and view_model without rebuilding and re-placing toggle menu. Useful for tables that have been rebuilt due to some ajax operation.
 * Dim table w/ opacity change while toggling? Would give visual feedback during slow toggle (> ~200ms) on large tables, and it's a relatively inexpensive style change in terms of rendering impact.
 * "disable" method to render plugin non-functional without undoing it completely? Appears to be as simple as setting button's "disabled" property to true.
* table search/filter, if it can be made fast enough