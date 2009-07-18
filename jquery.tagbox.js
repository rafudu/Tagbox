; (function($) {

    $.tag_box = {
        defaults: {
            separator: /[,]/,
						name: "tags[]",
						className : "tag"
            // It's possible to use multiple separators, like /[,;.]/
        }
    };


    $.fn.extend({
        tag_box: function(settings) {
						
            settings = jQuery.extend({},$.tag_box.defaults, settings);
						
						settings.tag_class = '.'+settings.className;
            var content = this;
            //Setting up the 'default' tag
            settings.tag = document.createElement('span');
            settings.tag.className = settings.className;
            settings.tag.innerHTML = '<label><span></span><input type="text" name="'+settings.name+'" value=" " /><abbr title="Fechar">X</abbr></label>';

            setup_tag(settings.tag, settings);

            this.each(function() {
							$(this).click(function(e) {
							            // If you click the tagbox, a new tag is created
							            $(this).append(new_tag()).find(settings.tag_class+':last input').focus();
							            });
						})

            // $(this).click();


						function sanitize(text){
							// tag,box,is,working, vermelho
							return text.replace(/\s/gim, '&nbsp;').replace("<", "&lt;") + "M"
						}

						function set_label(tag, text){
							tag.find('input').val(text).siblings('span').html(sanitize(text));
							return tag;
						}

						function split_groups (text) {
							// TODO : This function does not respect the tag order. It will show the groups first and then the other tags.
							var last_separator = "";

							if (text.charAt(text.length-1).match(settings.separator)) {
								last_separator = text.charAt(text.length-1);
							};
							var groups = new RegExp(settings.grouping+'.*?'+settings.grouping,"gim"),
							tags;
							
							//Remove extra spaces, remove the matched groups and split by separator.
							tags = text.replace(groups, "").replace(/(\s)\s/gim,"$1").split(settings.separator);
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
								.siblings('span')
								.html(sanitize(text))
				        .end()
				        .end();
				    };

						function setup_tag(tag, options) {
				        $(tag).click(function(e) {
				            e.stopPropagation();

				            var target = $(e.target);
				            if (target.is('abbr')) {
				                // If is the 'close' button, hide the tag and remove
				                $(this).animate({
				                    width: 'hide'
				                },
				                'fast',
				                function() {
				                    $(this).remove();
				                });

				                return false;
				            }
				            if (target.is(settings.tag_class)) {
				                // The space between the tags is actually the <span> element. If you clicked, you clicked between tags.
				                target.before(new_tag());
				                target.prev(settings.tag_class).find(':input').focus();
				            }

				        })
				        .find('input')
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
				        
				        .keyup(function() {
				            var target = $(this),
										value = this.value;
				            target.siblings('span').html(sanitize(this.value));
				            // Add "M" to correct the tag size. Weird, but works! Using M because it's probally the widest character.
				            if (value.match(options.separator)) {
				                // If text has separators
												
												
												if (options.grouping && value.indexOf(options.grouping) !== -1) {
													//If options.grouping and matches grouping character											
													
													var groupings = [value.indexOf(options.grouping), value.lastIndexOf(options.grouping)]
													// Store the locations of the grouping characters.
													
													if(groupings[0] == groupings[1]){ // Has a grouping char, but not terminated. The first and last occurrencies are in the same place. i.e. are the same.
														return; // stop script. No need to split
													}else {
														
														var is_group = new RegExp(("^"+options.grouping)+'.*'+(options.grouping+'$'));
														

														
														if (value.match(is_group) && value.match(new RegExp(options.grouping, "g")).length == 2) {
															// If it's a closed group (just 2 grouping chars, different places)
															return;
														}else{
														// Split the groups
														value = split_groups(value);
														}
													}
													
												};
												
												// If text has separators
												var tags;
												if (value.constructor === Array) {
													// If value is an Array, it's already splitted into tags
													tags = value;
												}else {
													tags = value.split(options.separator);
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