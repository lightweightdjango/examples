var app = (function ($) {
    var config = $('#config'),
        app = JSON.parse(config.text());
        
    return app;
})(jQuery);