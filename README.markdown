Tagbox
======
Tagbox is a simple tagging plugin for jQuery.

#Usage


(Examples at: [http://saynotofastfood.info/tagbox/examples](http://saynotofastfood.info/tagbox/examples))

[Download](http://cloud.github.com/downloads/rafudu/Tagbox/tagbox.1.0.1.zip) the plugin and include jquery.tagbox.js and tags.css in your page to get started.

The simplest way to use Tagbox is to put this code inside a `script` tag:

`	$('.tagbox').tag_box(); `

Tagbox can be applied to input / textarea fields. They will be converted to div's.

This way, when the user clicks on the `.tagbox` element, a new tag will be created to receive input. New tags are created automatically when user presses <ENTER>, <TAB> or ','.

##Parameters

* `classname`:_String_. The html class name of the tag (default: 'tag')
* `name`:_String_. The text field name (default: 'tags[]')
* `separator`:_RegExp_. Expression to split the text field text into new tags. (default: /[,]/ [comma])
* `grouping`:_String_. Character to group tags (a separator don't create a new tag when placed inside a group). (default: none)

// Tags separated by space, grouped by double-quotes with custom input name and class.
	$('.tagbox').tag_box({
		separator: /\s/,
		grouping: '"',
		className: 'recipients',
		name: 'recipients[]'
	});


##Separators

You can customize the separator character. If you want space separated tags, just use:

	$('.tagbox').tag_box({
		separator: /\s/
	});


The `separator` parameter is a regular expression. We also support multiple separators, like:

	$('.tagbox').tag_box({
		separator: /[,; ]/
	});

This way, we are splitting tags by ',' , ';' and space.

##Tag Groups

If you need tags grouped by quotes, just pass a string to the `grouping` parameter. Let's say you want space-separated tags, but grouped by quotes:

	$('.tagbox').tag_box({
		separator: /\s/,
		grouping: '"'
	}); 
Now you can have tags like "New York" and "Central Park".

##Callbacks

We provide you the ability to hook custom events to the `blur`, `onkeyup` and `onkeydown` from the options. These events are hooked before the plugin's blur, keyup and keydown events.

#Other uses

Use your creativity! Tagbox can be used in other kinds of user input, like contacts, product properties, etc.

#Contact


[http://raphamartins.com/contact](http://raphamartins.com/contact/)
