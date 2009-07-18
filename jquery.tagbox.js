; (function($) {

    $.tag_box = {
        defaults: {
            separator: /[,]/,
						name: "tag[]",
						className : "tag"
            // It's possible to use multiple separators, like /[,;.]/
        }
    };


    $.fn.extend({
        tag_box: function(settings) {
						
            settings = jQuery.extend({},$.tag_box.defaults, settings);
            var content = this;
            //Setting up the 'default' tag
            settings.tag = document.createElement('span');
            settings.tag.className = settings.className;
            settings.tag.innerHTML = '<label><span></span><input type="text" name="'+settings.name+'" value=" " /><abbr title="Fechar">X</abbr></label>';

            setup_tag(settings.tag, settings);

            this.each(function() {
							$(this).click(function(e) {
							            // If you click the tagbox, a new tag is created
							            $(this).append(new_tag()).find('.'+settings.className+':last input').focus();
							            });
						})

            // $(this).click();


						function sanitize(text){
							// tag,box,is,working, vermelho
							return text.replace(/ /gim, '&nbsp;').replace("<", "&lt;") + "M"
						}

						function set_label(tag, text){
							tag.find('input').val(text).siblings('span').text(sanitize(text));
							return tag;
						}

						function split_groups (text) {
							// TODO : This function does not respect the tag order. It will show the groups first and then the other tags.
							
							var groups = new RegExp(settings.grouping+'.*?'+settings.grouping,"gim"),
							tags;
							
							//Remove extra spaces, remove the matched groups and split by separator.
							tags = text.replace(groups, "").replace(/(\s)\s/gim,"$1").split(settings.separator);
							groups = text.match(groups); // Return the groups
							
							return $.merge(groups, tags);
						}
				    function new_tag(text) {
				        var text = text || ""

				        return $(settings.tag)
				        .clone(true) // Clone with events
				        .find('input')
				        .val(text)
								.siblings('span')
								.text(sanitize(text))
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
				            if (target.is('.'+settings.className)) {
				                // The space between the tags is actually the <span> element. If you clicked, you clicked between tags.
				                target.before(new_tag());
				                target.prev('.'+settings.className).find(':input').focus();
				            }

				        })
				        .find('input')
				        .blur(options.blur)
				        .blur(function(e) {
				            if (!$.trim($(this).val())) {
				                // If empty, remove the tag
				                setTimeout(function() {
				                    $(e.target).closest('.'+settings.className).remove();
				                },
				                100);
				                // This timeout is necessary for safari.
				            }
				        })
				        .keydown(options.keydown)
				        .keydown(function(e) {
				            if (e.keyCode == 13) {
				                // If ENTER key, do not submit.
				                e.preventDefault();
				            }
				            if (e.keyCode == 9 || e.keyCode == 13) {
				                // if TAB or ENTER
				                if (!e.shiftKey && $.trim($(this).val()) && !$(this).closest('.'+settings.className).next('.'+settings.className).length) {
				                    // And it's not shift+tab, and do not have a next tag
				                    var tag = $(this).closest('.'+settings.className).after(new_tag());
				                    setTimeout(function() {
				                        tag.next('.'+settings.className).find('input').focus();
				                    },
				                    50);
				                    return false;
				                }
				            }
				        })
				        .keyup(options.keyup)
				        .keyup(function() {
				            var target = $(this),
										value = this.value;
				            target.siblings('span').html(sanitize(this.value));
				            // Add "M" to correct the tag size. Weird, but works! Using M because it's probally the widest character.
				            if (value.match(options.separator)) {
				                // If text has separators
				
												//If options.grouping and matches grouping character
												if (options.grouping && value.indexOf(options.grouping) !== -1) {
																							
													var groupings = [value.indexOf(options.grouping), value.lastIndexOf(options.grouping)]
													// Store the locations of the grouping characters.
													
													if(groupings[0] == groupings[1]){ // Has a grouping char, but not terminated. The first and last occurrencies are in the same place. i.e. are the same.
														return; // stop script. No need to split
													}else {
														// Split the groups
														value = split_groups(value);
														
													}
												};
												
												// If text has separators
												var tags;
												if (value.constructor === Array) {
													tags = value;
												}else {
													tags = value.split(options.separator);
												}
				                tag = target.closest('.'+settings.className);
												target.val(tags[0]).siblings('span').html(sanitize(tags[0]));
												
				                var next_tag = [];

				                for (var i = tags.length - 1; i > 0; i--) {
														console.info(tags[i]);
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