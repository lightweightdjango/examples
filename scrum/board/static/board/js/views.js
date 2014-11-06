(function ($, Backbone, _, app) {

    var HomepageView = Backbone.View.extend({
        templateName: '#home-template',
        initialize: function () {
            this.template = _.template($(this.templateName).html());
        },
        render: function () {
            var context = this.getContext(),
            html = this.template(context);
            this.$el.html(html);
        },
        getContext: function () {
            return {};
        }
    });
    
    app.views.HomepageView = HomepageView;
    
})(jQuery, Backbone, _, app);