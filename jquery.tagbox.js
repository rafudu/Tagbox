; (function($) {

	$.tagbox = {
		defaults: {
			separator: /[,]/, // It's possible to use multiple separators, like /[,;.]/
			className : "tag", // without preciding .
			fx: true, // animation to remove the tag
			container: "div", // the tag that wraps tagbox, must be block level or with display:block in CSS
			suggestion_links: null, // links with suggestions
			dictionary_map: null, // function that translates your autocomplete dictionary object to a string
			autocomplete: null, // autocomplete dictionary
			autocomplete_action: 'selection',
						// 'selection' = selection mode completes the tag inline and select the remaining parts
						// 'list' = shows a list of results. user can use arrow keys to select
						// function = your custom function is called, resuts array is passed as parameter
			autocomplete_list_html: null // experimental, it's highlly recomended that you copy and extend our internal html
		}
	};

	$.fn.extend({
		tagbox: function(settings) {
			// object to preserve chainability
			var $chain = this,
				remove_from_chain=[];
			
			this.each(function init_box() {
				var $box = $(this);

				settings = jQuery.extend({},$.tagbox.defaults, settings);
				if (settings.autocomplete && settings.autocomplete.constructor == String) {
					// If autocomplete is a string, parse it as a dictionary and sort.
					settings.autocomplete = split_tags(settings.autocomplete, settings).sort();
				}

				settings.tag_class = '.'+settings.className;
				//Setting up the 'default' tag, witch is, an original DOM element that is never inserted, only cloned
				settings.tag = $('<span class="'+settings.className+'"><label><span></span><input type="text" autocomplete="off" name="'+settings.name+'" value=" " /><small class="close" title="close">x</small></label></span>').get(0);
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
					if($chain.push) {
						// jQuery 1.3+
						$chain.push($box.get(0));
					} else {
						// jQuery 1.2.6 compatibility
						$chain[$chain.size()] = $box.get(0);
						$chain.length++;
					}
					remove_from_chain.push($old.get(0)); // queue for later removal, since we are inside the jQuery.each protected loop
					// remove from the DOM
					$old.remove();
					
				};
				// only apply tagbox once
				if ($.data($box.get(0),'settings')) {
					return;
				}
				settings.box = $box.get(0);
				// store settings so functions outside the init code can find it
				$.data($box.get(0),'settings',settings);

				$box
					.click(function(e, text) {
						// If you click the tagbox, a new tag is created
						if(e.target == this) {
							$(this).tagboxNewTagAppend(text, settings).find(settings.tag_class+':last input').focus();
						} else if ($(e.target).is('#tagbox_autocomplete_sugestions .item')) {
							e.preventDefault();e.stopPropagation();
							if($('#tagbox_autocomplete_sugestions').size()) {
								var $choosen = $(e.target),
									textfield = $.data($('#tagbox_autocomplete_sugestions').get(0),'textfield');
								list_complete(textfield,$choosen,settings);
							}
							return false;
						}
					})
					.bind('add_tag', function(e, text) {
						$(this).trigger('click', text);
					})
					.bind('remove_tag', function(e, text,avoid_recursion) {
						if(!avoid_recursion) {
							remove_tag(find_tag.call(this, text), settings);
						}
					})
					.bind('toggle_tag', function(e, text) {
						suggestion = find_suggestion(text,settings);
						if(find_tag.call(this, text).length){
							suggestion.removeClass('active');
							remove_tag(find_tag.call(this, text), settings);
						}else {
							suggestion.addClass('active');
							$(this).trigger('add_tag', text);
						}
					});

				if ($.trim($box.text())) {
					// If the $box has any text, parse it into tags
					var tags = split_tags($.trim($box.text()), settings);
					$box.text("");

					$.each(tags, function(){
						if($.trim(this)){
							$box.tagboxNewTagAppend(this,settings);
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
					var sug_handler = function(e) {
						e.preventDefault();
						$box.trigger('toggle_tag', $(this).text());
					};
					if($.live) {
						$(settings.suggestion_links).live('click', sug_handler);
					} else {
						// jQuery 1.2.6 compatibility
						$(function(){
							$(settings.suggestion_links).click(sug_handler);
						});
					}
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
			
			// TODO: memory menagement - move find_tag outside the closure and maybe exposes it to the outside world

			function find_tag (text) {
				return $(this).find(settings.tag_class+' input').filter(function() {
						return $(this).val() == text
				}).parents(settings.tag_class);
			};
			
		},
		// TODO: decide what's best: method aproach or custom events aproach.
		// this names are lame, avoiding colisions is great, but we can make this better
		tagboxNewTagAppend: function(tag, settings){
			return newTagAction.call(this,tag, settings, 'append');
		},
		tagboxNewTagBefore: function(tag, settings){
			return newTagAction.call(this,tag, settings, 'before');
		},
		tagboxNewTagAfter: function(tag, settings){
			return newTagAction.call(this,tag, settings, 'after');
		}
	});
	
	function newTagAction(tag, settings, action) {
		if(!settings) {
			settings = get_settings(this.eq(0));
		}
		var the_tag = new_tag(tag, settings);
		this[action](the_tag);
		the_tag.find('input').keyup();
		$('#tagbox_autocomplete_sugestions').remove();
		return this;
	};
	
	function remove_tag(tag, settings) {
		$(settings.box).trigger('remove_tag',[tag,true])
		$(tag).find('input').remove();
		if (settings.fx) {
			// animate if settings.fx
			$(tag).animate(
				{width: 'hide'},
				'fast',
				function() {
					$(tag).remove();
				});
		}else {
			// or just remove, without animation
			$(tag).remove();
		}
	}
	
	function setup_tag(settings) {
		$(settings.tag)
			.click(settings.click)
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
	
	// receive an input string and return an array respecting groupings and preserving order
	function split_groups (text,settings) {
		var gr = settings.grouping, grTags=[],
			regexGroup = new RegExp(gr+'[^'+gr+']+'+gr,'g'); // regex to find grouping pairs

		var result = text.replace(regexGroup,function(tag){
			grTags.push(tag); // remember found grouped tags
			return '_GROUP_HERE_'; // and leave a placeholder in it's place
		});
		// split remaining tags and iterate the array
		// replacing placeholders by previously found groupings
		result = $.map(result.split(settings.separator),function(tag){
			return tag == '_GROUP_HERE_' ? grTags.shift() : tag;
		});

		return result;
	};

	function search_regx(word,settings) {
		return new RegExp("^"+(settings.grouping?settings.grouping+'?':'')+word,'i');
	};

	function search_in_dictionary (word, dictionary,settings) {
		// Accepts a string or regexp term
		if (typeof word == "string") {
			var word = search_regx(word,settings);
		}
		
		if ($.isFunction(dictionary)) {
			dictionary = split_tags(dictionary.call(), settings);
		}
		var results = [];
		$.each(dictionary, function(i, tag) {
			var item;
			if(settings.dictionary_map) {
				item = settings.dictionary_map.call(this,tag);
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
		var value = ''+textfield.value;
		// Find the tag in the dictionary
		var results = search_in_dictionary(value, settings.autocomplete,settings);
		if(settings.autocomplete_action == 'selection') {
			if (results.length) {
				var regx = search_regx(value,settings),
					current_index = textfield.selectionStart;
				if(!textfield.selectionStart && document.selection && document.selection.createRange) {
					var sel = document.selection.createRange();
					sel.moveStart('character', -textfield.value.length);
					current_index = sel.text.length;
				}
				value = value.substr(0,current_index);
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
					textfield.value = value.substr(0,current_index) + result + value.substr(current_index); 
				}
				var end_index = current_index + result.length;
				if (textfield.setSelectionRange) {
					textfield.setSelectionRange(current_index, end_index);
				} else if(textfield.createTextRange){
					var range = textfield.createTextRange();
					range.collapse(true);
					range.moveStart('character', current_index);
					range.moveEnd('character', end_index);
					range.select();
				}
			}
		} else if(settings.autocomplete_action == 'list') {
			if (results.length) {
				var $field = $(textfield),
					pos = $field.offset(),
					$tag = $field.parents(settings.tag_class),
					$suggestions = $('#tagbox_autocomplete_sugestions'),
					insert = false,html;
				if(settings.autocomplete_list_html) {
					html = settings.autocomplete_list_html.call(this,results,textfield);
					if(html === false) {
						$('#tagbox_autocomplete_sugestions').remove();
						return;
					}
				} else {
					var $listElems=$('<ul></ul>');
					$.each(results, function(i,item) {
						if(settings.dictionary_map) {
							result = settings.dictionary_map(item);
						} else {
							result = item;
						}
						var listItem = $('<li class="item">'+result+'</li>').get(0);
						$.data(listItem,'item',item);
						$listElems.append(listItem);
					});
					html = $listElems;
				}
				if($suggestions.size()===0) {
					$suggestions = $('<div id="tagbox_autocomplete_sugestions"></div>');
					insert = true;
				}
				$suggestions.css({position:'absolute',zIndex:300,top:(pos.top+$field.outerHeight())+'px', left:pos.left+'px'})
				$suggestions.empty().append(html);
				if(insert) {
					$suggestions.prependTo(settings.box);
				}
				$.data($suggestions.get(0),'textfield',textfield);
				$('#tagbox_autocomplete_sugestions .item').hover(function() {
					$(this).addClass('current').siblings('.item').removeClass('current');
				}, function() {
					$(this).removeClass('current')
				});
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
			find_suggestion($(this).parents(settings.tag_class).find('input').val(), settings).removeClass('active')
			
			remove_tag(this, settings);
			
			return false;
		}
		if (target.is(settings.tag_class)) {
			// The space between the tags is actually the <span> element. If you clicked, you clicked between tags.
			target.tagboxNewTagBefore(undefined,settings);
			target.prev(settings.tag_class).find(':input').focus();
		}

	};
	
	function internal_focus(e) {
		// Store the value to activate / deactivate the suggestions
		this.initialValue = this.value;
	};
	
	function internal_blur(e) {
		var settings = get_settings(e.target);
		
		if(settings.autocomplete_action == 'list') {
			// delete active suggestions, but not now, since other actions need the div to still exist
			(function(){ // closure to remember witch input is closing the suggestions
				var textfield = e.target; 
				setTimeout(function(){
					var $that = $('#tagbox_autocomplete_sugestions');
					if($that.size()) { // sugestion could be already gone closed buy keyup or focus or anything else
						var datafield = $.data($that.get(0),'textfield'); // get the current textfield using the suggestions
						if(datafield == textfield) { // make sure the suggestion is not showing other inputs suggestions before closing it
							$that.remove();
						}
					}
					textfield = null; // garbage collect for IE6
				},200);
			})();
		}
		if (!$.trim($(this).val())) {
			// If empty, remove the tag
			setTimeout(function() {
					$(e.target).parents(settings.tag_class).remove();
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
		if (e.keyCode == 13) {
			// If ENTER key, do not submit.
			e.preventDefault();
		}
		if(e.keyCode == 8 ) {
			// If BACKSPACE
			if (!$.trim($(this).val())) {
				var settings = get_settings(e.target), // only get settings here for performance
					tag = $(this).parents(settings.tag_class),
					prev_tag = tag.prev(settings.tag_class);
				if(prev_tag.size()){
					prev_tag.find(':input').focus();
					remove_tag(tag, settings);
					e.preventDefault();
				}
			};
		}
		if (e.keyCode == 9 || e.keyCode == 13) {
			// if TAB or ENTER
			var settings = get_settings(e.target); // only get settings here for performance
			// if autocomplete list
			var $choosen = $('#tagbox_autocomplete_sugestions .current');
			if(settings.autocomplete_action == 'list' && $choosen.size() !== 0) {
				list_complete(this,$choosen,settings);
			}
			
			// if this is the last tag on the box, create a new empty tag
			if (!e.shiftKey && $.trim($(this).val()) && !$(this).parents(settings.tag_class).nextAll(settings.tag_class).size()) {
				// And it's not shift+tab, and do not have a next tag
				var tag = $(this).parents(settings.tag_class).tagboxNewTagAfter(undefined,settings);
				setTimeout(function() {
					tag.next(settings.tag_class).find('input').focus();
				},
				50);
				return true;
			}
		}
		if (e.keyCode == 38 || e.keyCode == 40) {
			// if UP or DOWN
			var way = e.keyCode === 38 ? 'prevAll':'nextAll',
				$curr = $('#tagbox_autocomplete_sugestions .current');
			if($curr.size()==0) {
				$('#tagbox_autocomplete_sugestions .item:'+(e.keyCode === 38 ? 'last':'first')).addClass('current');
			} else {
				$curr.removeClass('current')[way]('.item:first').addClass('current');
			}
		}
	};
	
	function list_complete(elem,$choosen,settings) {
		var result = '',
			item = $.data($choosen.get(0),'item'),
			$elm = $(elem);
		if(settings.dictionary_map) {
			result = settings.dictionary_map(item);
		} else {
			result = item;
		}
		$(elem).val(result).parents(settings.container).trigger('choose_tag',[elem,item]);
		$(elem).keyup();
		$('#tagbox_autocomplete_sugestions').remove();
	};
	
	function internal_keyup(e,force_autocomplete) {
		var target = $(this),
			value = this.value,
			settings = get_settings(e.target);
		//autocomplete
		if ( settings.autocomplete  && value.length && ( force_autocomplete || String.fromCharCode(e.keyCode).match(/[a-z0-9@._-]/gim) || e.keyCode == 8) ) {
			autocomplete(this,settings);
		};
		
		target.siblings('span').html(sanitize(value));
		// Add "M" to correct the tag size. Weird, but works! Using M because it's probally the widest character.
		if ((settings.separator).test(value)) {
			// If text has separators
			var tags = split_tags(value, settings);
			if(!tags || !tags.length){ // This way we can cancel the event if no extra processing is needed. (e.g. unmatched grouping character)
				return;
			}
			if(tags.length===1) {
				// IE creates a 1 sized array, others create an 2 sized array with second item as empty sting
				tags.push('');
			}
			tag = target.parents(settings.tag_class);
			
			target.val(tags[0]);
			target.siblings('span').html(sanitize(tags[0]));
			
			var next_tag = [];
			for (var i = tags.length - 1; i > 0; i--) {
					
					next_tag.push($(tag).tagboxNewTagAfter(tags[i], settings).next());
					// Create new tags for each separator
			};
			// Focus the last shown (first created) tag
			next_tag.shift().find('input').focus();

			if (!$.trim(tags[0])) { //If the first tag is empty, remove
				remove_tag(tag,settings);
			}

			
		}
		
		// TODO: split tag when user types the 'closing' separator
		// Case: .tagbox({separator:/ /,grouping:'"'})
		// Steps: A) user types: ["testing grouping] B) user types characters " a b c in sequence
		// Today: ["testing grouping"abc]
		// Expected: ["testing grouping"] [abc]
		
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
		$tag.find('input')
			.siblings('span').html(sanitize(text))
			.end().val(text).attr('name', settings.name);
		return $tag;
	};
	
	function sanitize(text){
		return text.replace(/\s/g, '&nbsp;').replace("<", "&lt;") + "M"
	};

	function set_label(tag, text){
		tag.find('input').val(text).siblings('span').html(sanitize(text));
		return tag;
	};
	

	
} (jQuery));