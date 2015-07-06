(function ($, Backbone, _, app) {

    var TemplateView = Backbone.View.extend({
        templateName: '',
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

    var FormView = TemplateView.extend({
        events: {
            'submit form': 'submit'
        },
        errorTemplate: _.template('<span class="error"><%- msg %></span>'),
        clearErrors: function () {
            $('.error', this.form).remove();
        },
        showErrors: function (errors) {
            _.map(errors, function (fieldErrors, name) {
                var field = $(':input[name=' + name + ']', this.form),
                    label = $('label[for=' + field.attr('id') + ']', this.form);
                if (label.length === 0) {
                    label = $('label', this.form).first();
                }
                function appendError(msg) {
                    label.before(this.errorTemplate({msg: msg}));
                }
                _.map(fieldErrors, appendError, this);
            }, this);
        },
        serializeForm: function (form) {
            return _.object(_.map(form.serializeArray(), function (item) {
                // Convert object to tuple of (name, value)
                return [item.name, item.value];
            }));
        },
        submit: function (event) {
            event.preventDefault();
            this.form = $(event.currentTarget);
            this.clearErrors();
        },
        failure: function (xhr, status, error) {
            var errors = xhr.responseJSON;
            this.showErrors(errors);
        },
        done: function (event) {
            if (event) {
                event.preventDefault();
            }
            this.trigger('done');
            this.remove();
        }
    });

    var HomepageView = TemplateView.extend({
        templateName: '#home-template'
    });

    var LoginView = FormView.extend({
        id: 'login',
        templateName: '#login-template',
        submit: function (event) {
            var data = {};
            FormView.prototype.submit.apply(this, arguments);
            data = this.serializeForm(this.form);
            $.post(app.apiLogin, data)
                .done($.proxy(this.loginSuccess, this))
                .fail($.proxy(this.failure, this));
        },
        loginSuccess: function (data) {
            app.session.save(data.token);
            this.done();
        }
    });

    var HeaderView = TemplateView.extend({
        tagName: 'header',
        templateName: '#header-template',
        events: {
            'click a.logout': 'logout'
        },
        getContext: function () {
            return {authenticated: app.session.authenticated()};
        },
        logout: function (event) {
            event.preventDefault();
            app.session.delete();
            window.location = '/';
        }
    });

    app.views.HomepageView = HomepageView;
    app.views.LoginView = LoginView;
    app.views.HeaderView = HeaderView;

})(jQuery, Backbone, _, app);
