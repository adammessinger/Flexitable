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
      * Save table's column states when user checks/unchecks a column box.
      * Keep it compact and simple: array of columns such that keys match 
        `column_maps_list`, with values of `0` for hidden or `1` for shown.
      * [Some `localStorage` issues to keep in mind](http://htmlui.com/blog/2011-08-23-5-obscure-facts-about-html5-localstorage.html).
      * Need to give some thought to storage keys. Simply using the table ID 
        could cause data over-writes and unexpected behavior if the plugin  user 
        has multiple tables with the same ID. Something like this would work as 
        long as there are no tables with matching IDs at the same URL:
        `'flexitable_[' + window.location.href + ']_' + view_model.id`
      * [Be mindful of storage quotas](http://www.raymondcamden.com/2015/04/14/blowing-up-localstorage-or-what-happens-when-you-exceed-quota/).
        As a product or site using Flexitable evolves, tables and whole pages may
        disappear or table IDs may change. Orphaned keys may bloat storage, and 
        there's a slim chance of exceeding quota. [Handle the resulting error](http://www.html5rocks.com/en/tutorials/offline/quota-research/#tos-localstorage) 
        (and the lack thereof in IE) gracefully, perhaps by (silently?) clearing
        all Flexitable storage for that domain and then retrying the save.
* [ ] Some kind of "processing" indicator that's shown after column checkbox
      clicked and hidden after the class changes are done. Gives visual feedback
      that something is, in fact, happening during the slow show/hide for very
      big tables. Already tried this with dimming/un-dimming table but the
      appearance change was too slow on a large table to be visible.
* [ ] Keep track of CSS selectors in a module-scope map object, so there's only
      one place to find and change them.
* [ ] Complete README file
* [x] Lazy caching of column cells in `column_maps_list[i].$cells` -- 
      leave `null` to start with, then query & cache when checked/unchecked in
      menu. Preliminary tests show that this would reduce by more than half the
      time needed to iterate over a table's columns, populate `column_maps_list`,
      and build the columns menu. However, it would require rethinking the plugin's
      responsive features. Showing and hiding columns based on cell classes added
      with JS wouldn't work anymore. Perhaps it could be an option, the enabling
      of which disables responsive features? Since the improvement is only truly
      noticeable with huge tables (thousands of rows, > tens of thousands of cells),
      punting on this for now as an edge-case enhancement.
