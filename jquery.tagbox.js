; (function($) {

    $.tagbox = {
        defaults: {
            separator: /[,]/,
						name: "tags[]",
						className : "tag",
            // It's possible to use multiple separators, like /[,;.]/
						fx: true, // animation to remove the tag
						container: "div", // the tag that wraps tagbox
						autocomplete: null, // autocomplete dictionary
						suggestion_links: null // links with suggestions
        }
    };


    $.fn.extend({
        tagbox: function(settings) {
						
            settings = jQuery.extend({},$.tagbox.defaults, settings);
						if (settings.autocomplete){
							if (settings.autocomplete.constructor == String || settings.autocomplete.constructor == Array) {
								// If autocomplete is a string or an array, parse it as a dictionary and sort.
								settings.autocomplete = split_tags(settings.autocomplete).sort();
							}
							else if(settings.autocomplete.constructor == Function){
								// a function that returns a dictionary when it's called. 
							}else {
								// MUST be an object, with a 'url' property that returns a dictionary, and a callback to receive the results
							}
						}

						settings.tag_class = '.'+settings.className;
            var content = this;
            //Setting up the 'default' tag
            settings.tag = document.createElement('span');
            settings.tag.className = settings.className;
            settings.tag.innerHTML = '<label><span></span><input type="text" name="'+settings.name+'" value=" " /><abbr class="close" title="close">x</abbr></label>';

            setup_tag(settings.tag, settings);

            this.each(function() {

							var elm = $(this);

							
							if ($(this).is(":input")) {

								settings.name = this.name; // We use the input's name as the default name in this case
								$(this).wrap(to_container_tag.apply(this));
								elm = elm.parent().text(elm.val());
								
								elm.find(':input').remove();
								
							};
							// only apply tagbox once
							if (elm.attr('data-tagbox')) {
								return;
							}else {
								elm.attr('data-tagbox', true);
							}

							elm.click(function(e, text) {
						      // If you click the tagbox, a new tag is created
							     $(this).append(new_tag(text)).find(settings.tag_class+':last input').focus();								            			 
									})
									.bind('add_tag', function(e, text) {
										if(!find_tag.call(this, text).length){
											$(this).trigger('click', text);
										}										
									})
									.bind('remove_tag', function(e, text) {
										
										find_tag.call(this, text).remove();

									})
									.bind('toggle_tag', function(e, text) {
										if(find_tag.call(this, text).length){
											$(this).trigger('remove_tag', text)
										}else {
											$(this).trigger('add_tag', text)
										}
									})

							if ($.trim(elm.text())) {
								// If the elm has any text, parse it into tags
								var tags = split_tags($.trim(elm.text()));
								elm.text("");

								$.each(tags, function(){
									if($.trim(this)){
										elm.append(new_tag(this));
									}
								})
								// If have suggestion links, check if any of the suggestions matches the current tags
								if (settings.suggestion_links) {
					          $(settings.suggestion_links).each(function() {
					            elm = $(this);
					            if($.inArray(elm.text(), tags) !== -1){
					              elm.addClass('active');
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
								  $(this).toggleClass('active')
								  elm.trigger('toggle_tag', $(this).text());
								  
								})
							};
							
						})

						function find_tag (text) {
							return $(this).find(settings.tag_class+' input').filter(function() {
									return $(this).val() == text
							}).closest(settings.tag_class);
						}
						function to_container_tag(){
							return '<'+settings.container+' class="'+this.className+'"></'+settings.container+'>';
						}

						function sanitize(text){
							return text.replace(/\s/g, '&nbsp;').replace("<", "&lt;") + "M"
						}

						function set_label(tag, text){
							tag.find('input').val(text).siblings('span').html(sanitize(text));
							return tag;
						}
						
						function split_tags (text){
							if (!text || text.constructor != String) {
								return text;
							};
							if (settings.grouping && text.indexOf(settings.grouping) !== -1) {
								//If settings.grouping and matches grouping character											
								
								var groupings = [text.indexOf(settings.grouping), text.lastIndexOf(settings.grouping)]
								// Store the locations of the grouping characters.
								
								if(groupings[0] == groupings[1]){ // Has a grouping char, but not terminated. The first and last occurrencies are in the same place. i.e. are the same.
									return false; // stop script. No need to split
								}else {
									
									var is_group = new RegExp(("^"+settings.grouping)+'.*'+(settings.grouping+'$'));
									

									
									if (text.match(is_group) && text.match(new RegExp(settings.grouping, "g")).length == 2) {
										// If it's a closed group (just 2 grouping chars, different places)
										return;
									}else{
									// Split the groups
									text = split_groups(text);
									}
								}
								
							};
							
							// If text has separators
							
							if (text.constructor === String) {
								// If text is an Array, it's already splitted into tags
								text = text.split(settings.separator);
							}
							return text
						}
						function split_groups (text) {
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
						}
				    function new_tag(text) {
				        var text = text || ""

				        return $(settings.tag)
				        .clone(true) // Clone with events
				        	.find('input')
				        		.val(text)
										.attr('name', settings.name)
											.siblings('span')
												.html(sanitize(text))
				        			.end()
				        		.end()
								.keyup();
				    };
						
						function search_in_dictionary (word, dictionary) {
							// Accepts a string or regexp term
							if (typeof word == "string") {
								var word = new RegExp("^"+word,'i');
							}
							
							if ($.isFunction(dictionary)) {
								dictionary = split_tags(dictionary.call()).sort();
							};
							var results = [];
							$.each(dictionary, function(i, tag) {
								if (tag.match(word)) {
									results.push(tag);
								};
							})
							return results;
						}
						
						function autocomplete (textfield) {
							
							var current_index = textfield.selectionStart,
							value = textfield.value.substr(0,current_index);
							var regx = new RegExp("^"+value,'i');
							
							// Find the tag in the dictionary
							var results = search_in_dictionary(value, settings.autocomplete);
							if (results.length) {
								//Default autocomplete
								var result = results[0].replace(regx,"");
								//if you're typing with the cursor in the middle of the string, do not autocomplete
								if (value.substr(current_index+1,result.length+1) != result){
									textfield.value = value.substr(0,current_index) + result+value.substr(current_index); 
								}
								textfield.setSelectionRange(current_index, current_index + result.length);
							};
						}
						
						function setup_tag(tag, options) {
				        $(tag).click(function(e) {
				            e.stopPropagation();

				            var target = $(e.target);
				            if (target.is('abbr')) {
											if (options.close) {
												// If a custom close event is passed
												var close_event = options.close.call(target, e, settings);
												if (close_event === false) {
													// if the event returns boolean, return the result. Allows user to cancel the default close action by returning false
													return close_event;
												};
											};
												
				                // If is the 'close' button, hide the tag and remove
												if (settings.fx) {
													// animate if settings.fx
													$(this).animate({
					                    width: 'hide'
					                },
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
				                target.before(new_tag());
				                target.prev(settings.tag_class).find(':input').focus();
				            }

				        })
				        .find('input')
								.focus(options.focus)
				        .blur(options.blur)
								.keydown(options.keydown)
								.keyup(options.keyup)
				        .blur(function(e) {
				            if (!$.trim($(this).val())) {
				                // If empty, remove the tag
				                setTimeout(function() {
				                    $(e.target).closest(settings.tag_class).remove();
				                },
				                100);
				                // This timeout is necessary for safari.
				            }
				        })
				        
				        .keydown(function(e) {
										if(e.keyCode == 8 ) {
											// If BACKSPACE
											if (!$.trim($(this).val())) {
												var tag = $(this).closest(settings.tag_class),
												prev_tag = tag.prev(settings.tag_class);
												if(prev_tag.length){
													prev_tag.find(':input').focus();
													tag.remove();
													e.preventDefault();
												}
												
											};
											
										}
				            if (e.keyCode == 13) {
				                // If ENTER key, do not submit.
				                e.preventDefault();
				            }
				            if (e.keyCode == 9 || e.keyCode == 13) {
				                // if TAB or ENTER
				                if (!e.shiftKey && $.trim($(this).val()) && !$(this).closest(settings.tag_class).next(settings.tag_class).length) {
				                    // And it's not shift+tab, and do not have a next tag
				                    var tag = $(this).closest(settings.tag_class).after(new_tag());
				                    setTimeout(function() {
				                        tag.next(settings.tag_class).find('input').focus();
				                    },
				                    50);
				                    return false;
				                }
				            }
				        })
				        
				        .keyup(function(e) {
				            var target = $(this),
										value = this.value;
										
										//autocomplete

										if ( options.autocomplete && String.fromCharCode(e.keyCode).match(/[a-z0-9@._-]/gim) && value.length) {
											  if (options.autocomplete.url) {
												
												};
												autocomplete(this);
											
										};
										
										
				            target.siblings('span').html(sanitize(this.value));
				            // Add "M" to correct the tag size. Weird, but works! Using M because it's probally the widest character.
				            if (value.match(options.separator)) {
				                // If text has separators
												
												
												var tags = split_tags(value);
												if(!tags){ // This way we can cancel the event if no extra processing is needed. (e.g. unmatched grouping character)
													return;
												}
				                tag = target.closest(settings.tag_class);
												
												target.val(tags[0]).siblings('span').html(sanitize(tags[0]));
												
				                var next_tag = [];
				                for (var i = tags.length - 1; i > 0; i--) {
														
				                    next_tag.push($(tag).after(new_tag(tags[i])).next());
				                    // Create new tags for each separator
				                };
												// Focus the last shown (first created) tag
				                next_tag.shift().find('input').focus();
				
												if (!$.trim(tags[0])) { //If the first tag is empty, remove
													tag.remove();
												}
				
				                
				            }
				        })
				    }


        }
    });

		
} (jQuery));