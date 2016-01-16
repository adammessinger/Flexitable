#To-Do List

* [ ] `refresh` method to re-init columns without rebuilding and re-placing
      toggle menu. Useful for tables that have been rebuilt due to some ajax
      operation, but still have the same columns.
* [ ] table search/filter, if it can be made fast enough
* [ ] Consider refactoring to use smaller objects instead of one monolithic 
      columnTogglerFactory. The factory function's role would then be composing
      these smaller objects (for toggle menu, toolbar, table) and returning some
      methods to attach to the view-model. Should make this more readable & make
      code reuse for search/filter easier if we go that route.
* [ ] Option to save column visibility state using `localStorage` 
      ([issue #1](https://github.com/adammessinger/Flexitable/issues/1)).
      Makes sense to save only the column states explicitly chosen by the user
      checking/unchecking a box.
* [ ] Some kind of "processing" indicator that's shown after column checkbox
      clicked and hidden after the class changes are done. Gives visual feedback
      that something is, in fact, happening during the slow show/hide for very
      big tables. Already tried this with dimming/un-dimming table but the
      appearance change was too slow on a large table to be visible.
* [ ] Keep track of CSS selectors in a module-scope map object, so there's only
      one place to find and change them.
* [ ] Complete README file
* [ ] Consider lazy caching of column cells in `column_maps_list[i].$cells` -- 
      leave `null` to start with, then query & cache when checked/unchecked in
      menu. Preliminary tests show that this would reduce by more than half the
      time needed to iterate over a table's columns, populate `column_maps_list`,
      and build the columns menu. However, it would require rethinking the plugin's
      responsive features. Showing and hiding columns based on cell classes added
      with JS wouldn't work anymore. Perhaps it could be an option, the enabling
      of which disables responsive features? Since the improvement is only truly
      noticeable with huge tables (thousands of rows, > tens of thousands of cells),
      punting on this for now as an edge-case enhancement.
