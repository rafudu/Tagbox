; (function($) {

    $.tag_box = {
        defaults: {
            separator: /[,]/
            // It's possible to use multiple separators, like /[,;.]/
        }
    };


    $.fn.extend({
        tag_box: function(settings) {
						
            settings = jQuery.extend({},$.tag_box.defaults, settings);
            var content = this;
            //Setting up the 'default' tag
            settings.tag = document.createElement('span');
            settings.tag.className = 'tag';
            settings.tag.innerHTML = '<label><span></span><input type="text" name="tag" value=" " /><abbr title="Fechar">X</abbr></label>';

            setup_tag(settings.tag, settings);

            $(this).click(function(e) {
                // If you click the tagbox, a new tag is created
                $(this).append(new_tag()).find('.tag:last input').focus();
            });

            // $(this).click();


						function sanitize(text){
							// tag,box,is,working, vermelho
							return text.replace(/ /gim, '&nbsp;').replace("<", "&lt;") + "M"
						}

						function set_label(tag, text){
							tag.find('input').val(text).siblings('span').text(sanitize(text));
							return tag;
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
				            if (target.is('span.tag')) {
				                // The space between the tags is actually the <span> element. If you clicked, you clicked between tags.
				                target.before(new_tag());
				                target.prev('.tag').find(':input').focus();
				            }

				        })
				        .find('input')
				        .blur(options.blur)
				        .blur(function(e) {
				            if (!$.trim($(this).val())) {
				                // If empty, remove the tag
				                setTimeout(function() {
				                    $(e.target).closest('.tag').remove();
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
				                if (!e.shiftKey && $.trim($(this).val()) && !$(this).closest('.tag').next('.tag').length) {
				                    // And it's not shift+tab, and do not have a next tag
				                    var tag = $(this).closest('.tag').after(new_tag());
				                    setTimeout(function() {
				                        tag.next('.tag').find('input').focus();
				                    },
				                    50);
				                    return false;
				                }
				            }
				        })
				        .keyup(options.keyup)
				        .keyup(function() {
				            var target = $(this);
				            target.siblings('span').html(sanitize(this.value));
				            // Add "M" to correct the tag size. Weird, but works!
				            if (this.value.match(options.separator)) {
				                // If text has separators
				                var tags = this.value.split(options.separator),
				                tag = target.closest('.tag');
												target.val(tags[0]).siblings('span').html(sanitize(this.value));
												
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