; (function($) {

	$.tagbox = {
		defaults: {
			separator: /[,]/, // It's possible to use multiple separators, like /[,;.]/
			className : "tag", // without preciding .
			fx: true, // animation to remove the tag
			container: "div", // the tag that wraps tagbox, must be block level or with display:block in CSS
			autocomplete: null, // autocomplete dictionary
			suggestion_links: null, // links with suggestions
			autocomplete_action: 'selection',
						// 'selection' = selection mode completes the tag inline and select the remaining parts
						// 'list' = shows a list of results. user can use arrow keys to select
						// function = your custom function is called, resuts array is passed as parameter
			dictionary_map: null // function that translates your dictionary object to a string
		}
	};

	$.fn.extend({
		tagbox: function(settings) {
			// object to preserve chainability
			var $chain = this;
			var remove_from_chain=[];
			
			this.each(function init_box() {
				var $box = $(this);

				settings = jQuery.extend({},$.tagbox.defaults, settings);
				if (settings.autocomplete){
					if (settings.autocomplete.constructor == String || settings.autocomplete.constructor == Array) {
						// If autocomplete is a string or an array, parse it as a dictionary and sort.
						settings.autocomplete = split_tags(settings.autocomplete, settings).sort();
					}
					else if(settings.autocomplete.constructor == Function){
						// a function that returns a dictionary when it's called. 
					}else {
						// MUST be an object, with a 'url' property that returns a dictionary, and a callback to receive the results
					}
				}

				settings.tag_class = '.'+settings.className;
				var content = this;
				//Setting up the 'default' tag, witch is, an original DOM element that is never inserted, only cloned
				settings.tag = $('<span class="'+settings.className+'"><label><span></span><input type="text" name="'+settings.name+'" value=" " /><small class="close" title="close">x</small></label></span>').get(0);
				setup_tag(settings);

				// transform inputs into some block level element
				if ($box.is(":input")) {
					var $old = $box;
					// keep name attr
					settings.name = settings.name || this.name; // We use the input's name as the default name in this case
					// create new element
					$box.wrap('<'+settings.container+' class="'+this.className+'"></'+settings.container+'>');
					// import string
					$box = $box.parent().text($box.val());
					// preserve chainability
					$chain.push($box.get(0));
					remove_from_chain.push($old.get(0)); // queue for later removal, since we are inside the jQuery.each protected loop
					// remove from the DOM
					$old.remove();
					
				};
				// only apply tagbox once
				if ($.data($box.get(0),'settings')) {
					return;
				}
				// store settings so functions outside the init code can find it
				$.data($box.get(0),'settings',settings);

				$box
					.click(function(e, text) {
						// If you click the tagbox, a new tag is created
						 $(this).append(new_tag(text, settings)).find(settings.tag_class+':last input').focus();
					})
					.bind('add_tag', function(e, text) {
						if(!find_tag.call(this, text).length){
							// if the tag doesn't exists
							$(this).trigger('click', text);
						}										
					})
					.bind('remove_tag', function(e, text) {
						
						find_tag.call(this, text).remove();

					})
					.bind('toggle_tag', function(e, text) {
						suggestion = find_suggestion(text,settings);
						if(find_tag.call(this, text).length){
							suggestion.removeClass('active')
							$(this).trigger('remove_tag', text)
						}else {
							suggestion.addClass('active');
							$(this).trigger('add_tag', text)
						}
					});

				if ($.trim($box.text())) {
					// If the $box has any text, parse it into tags
					var tags = split_tags($.trim($box.text()), settings);
					$box.text("");

					$.each(tags, function(){
						if($.trim(this)){
							var the_tag = new_tag(this, settings);
							$box.append(the_tag);
							the_tag.find('input').keyup()
						}
					});
					// If have suggestion links, check if any of the suggestions matches the current tags
					if (settings.suggestion_links) {
							$(settings.suggestion_links).each(function() {
								link = $(this);
								if($.inArray(link.text(), tags) !== -1){
									link.addClass('active');
								}
							})
					};
					// Only call INIT if has tags
					if ($.isFunction(settings.init)) {
						settings.init.call(this, tags)
					};
				};
				
				if (settings.suggestion_links) {
					//Bind a live event for the suggestions
					$(settings.suggestion_links).live('click', function(e) {
						e.preventDefault();
						$box.trigger('toggle_tag', $(this).text());
					});
				};
				
			});
			
			// return the chain after removing unused objects
			// this is needed becouse we transform :inputs into choosen dom elements (defaults div);
			return $chain.filter(function(index){
				var keep = true;
				for(var i=0;i<remove_from_chain.length;i++) {
					if(remove_from_chain[i] == $chain.get(index)) {
						keep = false;
					}
				}
				return keep;
			});
			
			// internal functions
			// TODO: memory menagement - move this functions outsite the .tagbox() function.

			function find_tag (text) {
				return $(this).find(settings.tag_class+' input').filter(function() {
						return $(this).val() == text
				}).closest(settings.tag_class);
			};
			
			function set_label(tag, text){
				tag.find('input').val(text).siblings('span').html(sanitize(text));
				return tag;
			};
			
			
		}
	});
	
	function setup_tag(settings) {
		$(settings.tag)
			.click(internal_click)
			.find('input')
			.focus(settings.focus)
			.blur(settings.blur)
			.keydown(settings.keydown)
			.keyup(settings.keyup)
			.focus(internal_focus)
			.blur(internal_blur)
			.keydown(internal_keydown)
			.keyup(internal_keyup);
	};

	// search the dom for settings stored with $.data()
	function get_settings(elem) {
		var ret,
			elem = elem instanceof jQuery?$(elem).get(0):elem, // find element
			set = $.data(elem,'settings'); // get settings, if exists
		if(typeof set != 'undefined' && set.hasOwnProperty('separator')) {
			// found. return it
			ret = set;
		} else {
			// recurse up the DOM
			ret = get_settings(elem.parentNode);
		}
		return ret;
	};
	
	function split_groups (text,settings) {
		// TODO : This function does not respect the tag order. It will show the groups first and then the other tags.
		var last_separator = "";

		if (text.charAt(text.length-1).match(settings.separator)) {
			last_separator = text.charAt(text.length-1);
		};
		var groups = new RegExp(settings.grouping+'.*?'+settings.grouping,"g"),
		tags;
		
		//Remove extra spaces, remove the matched groups and split by separator.
		tags = text.replace(groups, "").replace(/(\s)\s/g,"$1").split(settings.separator);
		groups = text.match(groups); // Return the groups
		
		text = $.map($.merge(groups, tags), function(tag) {
			if(tag){
				return $.trim(tag);
			}
		});
		text.push(last_separator);
		return text;
	};

	function search_in_dictionary (word, dictionary,settings) {
		// Accepts a string or regexp term
		if (typeof word == "string") {
			var word = new RegExp("^"+word,'i');
		}
		
		if ($.isFunction(dictionary)) {
			dictionary = split_tags(dictionary.call(), settings);//.sort();
		}
		var results = [];
		$.each(dictionary, function(i, tag) {
			if(settings.dictionary_map) {
				item = settings.dictionary_map(tag);
			} else {
				item = tag;
			}
			if (item.match(word)) {
				results.push(tag);
			};
		});
		return results;
	};

	function autocomplete (textfield,settings) {
		var current_index = textfield.selectionStart,
		value = textfield.value.substr(0,current_index);
		var regx = new RegExp("^"+value,'i');
		// Find the tag in the dictionary
		var results = search_in_dictionary(value, settings.autocomplete,settings);
		// console.clear();
		if(settings.autocomplete_action == 'selection') {
			if (results.length) {
				// console.dir(results);
				//Default autocomplete
				var result;
				if(settings.dictionary_map) {
					result = settings.dictionary_map(results[0]);
				} else {
					result = results[0];
				}
			
				result = result.replace(regx,"");
				//if you're typing with the cursor in the middle of the string, do not autocomplete
				if (value.substr(current_index+1,result.length+1) != result){
					textfield.value = value.substr(0,current_index) + result+value.substr(current_index); 
				}
				textfield.setSelectionRange(current_index, current_index + result.length);
			}
		} else if(settings.autocomplete_action == 'list') {
			if (results.length) {
				// console.dir(results);
				var $field = $(textfield),
					pos = $field.offset(),
					$tag = $field.closest(settings.tag_class),
					$suggestions = $('#tagbox_autocomplete_sugestions'),
					insert = false, html="<ul>";
				$.each(results, function(i,item) {
					if(settings.dictionary_map) {
						result = settings.dictionary_map(item);
					} else {
						result = item;
					}
					html += '<li>'+result+'</li>';
				});
				html +='</ul>';
				if($suggestions.size()===0) {
					$suggestions = $('<div id="tagbox_autocomplete_sugestions"></div>');
					insert = true;
				}
				$suggestions.css({position:'absolute',top:(pos.top+$field.innerHeight())+'px', left:pos.left+'px',background:'silver'})
				$suggestions.html(html);
				if(insert) {
					$suggestions.insertAfter($tag.get(0));
				}
			} else {
				$('#tagbox_autocomplete_sugestions').remove();
			}
		} else if($.isFunction(settings.autocomplete_action)) {
			settings.autocomplete_action.call(this,results);
		}
	};

	function find_suggestion (text, settings) {
		return $(settings.suggestion_links).filter(function() {
			return $(this).text() == text
		})
	};
	
	
	function internal_click(e) {
		e.stopPropagation();
		settings = get_settings(e.target);

		var target = $(e.target);
		if (target.is('.close')) {
			if (settings.close) {
				// If a custom close event is passed, call it
				var close_event = settings.close.call(target, e, settings);
				if (typeof close_event === 'boolean') {
					// if the event returns boolean, return the result. Allows user to cancel the default close action by returning false
					return close_event;
				}
			}
			//deactivate the suggestion for this tag, if exists
			find_suggestion($(this).closest(settings.tag_class).find('input').val(), settings).removeClass('active')
			// If is the 'close' button, hide the tag and remove
			if (settings.fx) {
				// animate if settings.fx
				$(this).animate(
					{width: 'hide'},
					'fast',
					function() {
						$(this).remove();
					});
			}else {
				// or just remove, without animation
				$(this).remove();
			}
			
			
			return false;
		}
		if (target.is(settings.tag_class)) {
			// The space between the tags is actually the <span> element. If you clicked, you clicked between tags.
			target.before(new_tag(undefined,settings));
			target.prev(settings.tag_class).find(':input').focus();
		}

	};
	
	function internal_focus(e) {
		// Store the value to activate / deactivate the suggestions
		this.initialValue = this.value;
	};
	
	function internal_blur(e) {
		var settings = get_settings(e.target);
		if (!$.trim($(this).val())) {
			// If empty, remove the tag
			setTimeout(function() {
					$(e.target).closest(settings.tag_class).remove();
			},100);
			// This timeout is necessary for safari.
		}else if(settings.suggestion_links) {
			// If not empty, activate and deactivate the suggestions
			if (this.initialValue != this.value ) { // Get the initial value and deactivate
				find_suggestion(this.initialValue,settings).removeClass('active');
			};
			find_suggestion(this.value,settings).addClass('active'); // Get the current value and activate
		}
	};
	
	function internal_keydown(e) {
		if(e.keyCode == 8 ) {
			if (e.keyCode == 13) {
				// If ENTER key, do not submit.
				e.preventDefault();
			}
			// If BACKSPACE
			if (!$.trim($(this).val())) {
				var settings = get_settings(e.target), // only get settings here for performance
					tag = $(this).closest(settings.tag_class),
					prev_tag = tag.prev(settings.tag_class);
				if(prev_tag.length){
					prev_tag.find(':input').focus();
					tag.remove();
					e.preventDefault();
				}
			};
		}
		if (e.keyCode == 9 || e.keyCode == 13) {
			var settings = get_settings(e.target); // only get settings here for performance
			// if TAB or ENTER
			if (!e.shiftKey && $.trim($(this).val()) && !$(this).closest(settings.tag_class).next(settings.tag_class).length) {
				// And it's not shift+tab, and do not have a next tag
				var tag = $(this).closest(settings.tag_class).after(new_tag(undefined,settings));
				setTimeout(function() {
						tag.next(settings.tag_class).find('input').focus();
				},
				50);
				return true;
			}
		}
	};
	
	function internal_keyup(e) {
		var target = $(this),
			value = this.value,
			settings = get_settings(e.target);
		//autocomplete
		if ( settings.autocomplete && String.fromCharCode(e.keyCode).match(/[a-z0-9@._-]/gim) && value.length) {
			if (settings.autocomplete.url) {
				// TODO: someting
			};
			autocomplete(this,settings);
		};
		
		target.siblings('span').html(sanitize(value));
		// Add "M" to correct the tag size. Weird, but works! Using M because it's probally the widest character.
		if ((settings.separator).test(value)) {
			// If text has separators
			var tags = split_tags(value, settings);
			if(!tags){ // This way we can cancel the event if no extra processing is needed. (e.g. unmatched grouping character)
				return;
			}
			if(tags.length===1) {
				// IE creates a 1 sized array, others create an 2 sized array with second item as empty sting
				tags.push('');
			}
			tag = target.closest(settings.tag_class);
			
			target.val(tags[0]).siblings('span').html(sanitize(tags[0]));
			
			var next_tag = [];
			for (var i = tags.length - 1; i > 0; i--) {
					
					next_tag.push($(tag).after(new_tag(tags[i], settings)).next());
					// Create new tags for each separator
			};
			// Focus the last shown (first created) tag
			next_tag.shift().find('input').focus();

			if (!$.trim(tags[0])) { //If the first tag is empty, remove
				tag.remove();
			}

			
		}
	};
	
	function split_tags (text, settings){
		if (!text || text.constructor != String) {
			return text;
		};
		if (settings.grouping && text.indexOf(settings.grouping) !== -1) {
			//If settings.grouping and matches grouping character											
			var groupings = [text.indexOf(settings.grouping), text.lastIndexOf(settings.grouping)]
			// Store the locations of the grouping characters.
			if (groupings[0] == groupings[1]){ // Has a grouping char, but not terminated. The first and last occurrencies are in the same place. i.e. are the same.
				return false; // stop script. No need to split
			} else {
				var is_group = new RegExp(("^"+settings.grouping)+'.*'+(settings.grouping+'$'));
				if (text.match(is_group) && text.match(new RegExp(settings.grouping, "g")).length == 2) {
					// If it's a closed group (just 2 grouping chars, different places)
					return;
				}else{
				// Split the groups
				text = split_groups(text,settings);
				}
			}
			
		};
		// If text has separators
		if (text.constructor === String) {
			// If text is an Array, it's already splitted into tags
			text = text.split(settings.separator);
		}
		return text;
	};
	
	function new_tag(text, settings) {
		var text = text || "",
			$tag = $(settings.tag).clone(true); // Clone with events
		// $.data($tag.get(0),'settings',settings);
		$tag.find('input')
			.siblings('span').html(sanitize(text))
			.end().val(text).attr('name', settings.name);
		return $tag;
	};
	
	function sanitize(text){
		return text.replace(/\s/g, '&nbsp;').replace("<", "&lt;") + "M"
	};

	

	
} (jQuery));