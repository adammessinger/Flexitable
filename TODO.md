#To-Do List

* Add a way (data attribute?) to associate a toolbar with a specific enhanced table. Now that the toolbar can be placed anywhere, proximity on the DOM tree isn't enough (and was a flimsy approach to begin with).
* Drop column toggle menu into page above table first. If user clicks menu button before init is complete, the drop-down will display a progress meter until this is hidden and checkbox list populated. Alternately, the menu button itself becomes a progress bar by starting disabled, filling with green from left to right, then having the green fade and getting enabled after table processing is complete.
* Init column toggling only once column button is clicked? Shouldn't make much difference for small tables, and would save needless high processor usage on large tables.
* Complete README file
* Dim table w/ opacity change while toggling? Would give visual feedback during slow toggle (> ~200ms) on large tables, and it's a relatively inexpensive style change in terms of rendering impact.
* "disable" method to render plugin non-functional without undoing it completely? Appears to be as simple as setting button's "disabled" property to true. "enable" method to turn it back on again.
* "refresh" method to re-init cells by column without rebuilding and re-placing toggle menu. Useful for tables that have been rebuilt due to some ajax operation, but still have the same columns.
* "rebuild" (private?) method to destroy and reinitialize Flexitable
* Instead of instantiating a column chooser whenever Flexitable is called, store its returned methods on the view model for re-use? Not sure yet how much this would actually get us other than the ability to, for example, `$('#product-comparator').data('Flexitable').columnChooser.refresh()`. That would be enough, though, if any of the methods in question returned a promise that can't be chained when the method is invoked indirectly via the plugin's options.
* table search/filter, if it can be made fast enough