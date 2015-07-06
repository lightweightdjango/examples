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
            'submit form': 'submit',
            'click button.cancel': 'done'
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
        },
        modelFailure: function (model, xhr, options) {
            var errors = xhr.responseJSON;
            this.showErrors(errors);
        }
    });

    var NewSprintView = FormView.extend({
        templateName: '#new-sprint-template',
        className: 'new-sprint',
        submit: function (event) {
            var self = this,
                attributes = {};
            FormView.prototype.submit.apply(this, arguments);
            attributes = this.serializeForm(this.form);
            app.collections.ready.done(function () {
                app.sprints.create(attributes, {
                    wait: true,
                    success: $.proxy(self.success, self),
                    error: $.proxy(self.modelFailure, self)
                });
            });
        },
        success: function (model) {
            this.done();
            window.location.hash = '#sprint/' + model.get('id');
        }
    });

    var HomepageView = TemplateView.extend({
        templateName: '#home-template',
        events: {
            'click button.add': 'renderAddForm'
        },
        initialize: function (options) {
            var self = this;
            TemplateView.prototype.initialize.apply(this, arguments);
            app.collections.ready.done(function () {
                var end = new Date();
                end.setDate(end.getDate() - 7);
                end = end.toISOString().replace(/T.*/g, '');
                app.sprints.fetch({
                    data: {end_min: end},
                    success: $.proxy(self.render, self)
                });
            });
        },
        getContext: function () {
            return {sprints: app.sprints || null};
        },
        renderAddForm: function (event) {
            var view = new NewSprintView(),
                link = $(event.currentTarget);
            event.preventDefault();
            link.before(view.el);
            link.hide();
            view.render();
            view.on('done', function () {
                link.show();
            });
        }
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

    var AddTaskView = FormView.extend({
        templateName: '#new-task-template',
        submit: function (event) {
            var self = this,
                attributes = {};
            FormView.prototype.submit.apply(this, arguments);
            attributes = this.serializeForm(this.form);
            app.collections.ready.done(function () {
                app.tasks.create(attributes, {
                    wait: true,
                    success: $.proxy(self.success, self),
                    error: $.proxy(self.modelFailure, self)
                });
            });
        },
        success: function (model, resp, options) {
            this.done();
        }
    });

    var StatusView = TemplateView.extend({
        tagName: 'section',
        className: 'status',
        templateName: '#status-template',
        events: {
            'click button.add': 'renderAddForm',
            'dragenter': 'enter',
            'dragover': 'over',
            'dragleave': 'leave',
            'drop': 'drop'
        },
        initialize: function (options) {
            TemplateView.prototype.initialize.apply(this, arguments);
            this.sprint = options.sprint;
            this.status = options.status;
            this.title = options.title;
        },
        getContext: function () {
            return {sprint: this.sprint, title: this.title};
        },
        renderAddForm: function (event) {
            var view = new AddTaskView(),
                link = $(event.currentTarget);
            event.preventDefault();
            link.before(view.el);
            link.hide();
            view.render();
            view.on('done', function () {
                link.show();
            });
        },
        addTask: function (view) {
            $('.list', this.$el).append(view.el);
        },
        enter: function (event) {
            event.originalEvent.dataTransfer.effectAllowed = 'move';
            event.preventDefault();
            this.$el.addClass('over');
        },
        over: function (event) {
            event.originalEvent.dataTransfer.dropEffect = 'move';
            event.preventDefault();
            return false;
        },
        leave: function (event) {
            this.$el.removeClass('over');
        },
        drop: function (event) {
            var dataTransfer = event.originalEvent.dataTransfer,
                task = dataTransfer.getData('application/model'),
                tasks, order;
            if (event.stopPropagation) {
                event.stopPropagation();
            }
            task = app.tasks.get(task);
            tasks = app.tasks.where({sprint: this.sprint, status: this.status});
            if (tasks.length) {
                order = _.min(_.map(tasks, function (model) {
                    return model.get('order');
                }));
            } else {
                order = 1;
            }
            task.moveTo(this.status, this.sprint, order - 1);
            this.trigger('drop', task);
            this.leave();
        }
    });

    var TaskDetailView = FormView.extend({
        tagName: 'div',
        className: 'task-detail',
        templateName: '#task-detail-template',
        events: _.extend({
            'blur [data-field][contenteditable=true]': 'editField'
        }, FormView.prototype.events),
        initialize: function (options) {
            FormView.prototype.initialize.apply(this, arguments);
            this.task = options.task;
            this.changes = {};
            $('button.save', this.$el).hide();
            this.task.on('change', this.render, this);
            this.task.on('remove', this.remove, this);
        },
        getContext: function () {
            return {task: this.task, empty: '-----'};
        },
        submit: function (event) {
            FormView.prototype.submit.apply(this, arguments);
            this.task.save(this.changes, {
                wait: true,
                success: $.proxy(this.success, this),
                error: $.proxy(this.modelFailure, this)
            });
        },
        success: function (model) {
            this.changes = {};
            $('button.save', this.$el).hide();
        },
        editField: function (event) {
            var $this = $(event.currentTarget),
                value = $this.text().replace(/^\s+|\s+$/g,''),
                field = $this.data('field');
            this.changes[field] = value;
            $('button.save', this.$el).show();
        },
        showErrors: function (errors) {
            _.map(errors, function (fieldErrors, name) {
                var field = $('[data-field=' + name + ']', this.$el);
                if (field.length === 0) {
                    field = $('[data-field]', this.$el).first();
                }
                function appendError(msg) {
                    var parent = field.parent('.with-label'),
                        error = this.errorTemplate({msg: msg});
                    if (parent.length  === 0) {
                        field.before(error);
                    } else {
                        parent.before(error);
                    }
                }
                _.map(fieldErrors, appendError, this);
            }, this);
        }
    });

    var TaskItemView = TemplateView.extend({
        tagName: 'div',
        className: 'task-item',
        templateName: '#task-item-template',
        events: {
            'click': 'details',
            'dragstart': 'start',
            'dragenter': 'enter',
            'dragover': 'over',
            'dragleave': 'leave',
            'dragend': 'end',
            'drop': 'drop'
        },
        attributes: {
            draggable: true
        },
        initialize: function (options) {
            TemplateView.prototype.initialize.apply(this, arguments);
            this.task = options.task;
            this.task.on('change', this.render, this);
            this.task.on('remove', this.remove, this);
        },
        getContext: function () {
            return {task: this.task};
        },
        render: function () {
            TemplateView.prototype.render.apply(this, arguments);
            this.$el.css('order', this.task.get('order'));
        },
        details: function () {
            var view = new TaskDetailView({task: this.task});
            this.$el.before(view.el);
            this.$el.hide();
            view.render();
            view.on('done', function () {
                this.$el.show();
            }, this);
        },
        start: function (event) {
            var dataTransfer = event.originalEvent.dataTransfer;
            dataTransfer.effectAllowed = 'move';
            dataTransfer.setData('application/model', this.task.get('id'));
            this.trigger('dragstart', this.task);
        },
        enter: function (event) {
            event.originalEvent.dataTransfer.effectAllowed = 'move';
            event.preventDefault();
            this.$el.addClass('over');
        },
        over: function (event) {
            event.originalEvent.dataTransfer.dropEffect = 'move';
            event.preventDefault();
            return false;
        },
        end: function (event) {
            this.trigger('dragend', this.task);
        },
        leave: function (event) {
            this.$el.removeClass('over');
        },
        drop: function (event) {
            var self = this,
                dataTransfer = event.originalEvent.dataTransfer,
                task = dataTransfer.getData('application/model'),
                tasks, order;
            if (event.stopPropagation) {
                event.stopPropagation();
            }
            task = app.tasks.get(task);
            if (task !== this.task) {
                // Task is being moved in front of this.task
                order = this.task.get('order');
                tasks = app.tasks.filter(function (model) {
                    return model.get('id') !== task.get('id') &&
                        model.get('status') === self.task.get('status') &&
                        model.get('sprint') === self.task.get('sprint') &&
                        model.get('order') >= order;
                });
                _.each(tasks, function (model, i) {
                    model.save({order: order + (i + 1)});
                });
                task.moveTo(
                    this.task.get('status'),
                    this.task.get('sprint'),
                    order);
            }
            this.trigger('drop', task);
            this.leave();
            return false;
        },
        lock: function () {
            this.$el.addClass('locked');
        },
        unlock: function () {
            this.$el.removeClass('locked');
        }
    });

    var SprintView = TemplateView.extend({
        templateName: '#sprint-template',
        initialize: function (options) {
            var self = this;
            TemplateView.prototype.initialize.apply(this, arguments);
            this.sprintId = options.sprintId;
            this.sprint = null;
            this.tasks = {};
            this.statuses = {
                unassigned: new StatusView({
                    sprint: null, status: 1, title: 'Backlog'}),
                todo: new StatusView({
                    sprint: this.sprintId, status: 1, title: 'Not Started'}),
                active: new StatusView({
                    sprint: this.sprintId, status: 2, title: 'In Development'}),
                testing: new StatusView({
                    sprint: this.sprintId, status: 3, title: 'In Testing'}),
                done: new StatusView({
                    sprint: this.sprintId, status: 4, title: 'Completed'})
            };
            _.each(this.statuses, function (view, name) {
                view.on('drop', function (model) {
                    this.socket.send({
                        model: 'task',
                        id: model.get('id'),
                        action: 'drop'
                    });
                }, this);
            }, this);
            this.socket = null;
            app.collections.ready.done(function () {
                app.tasks.on('add', self.addTask, self);
                app.tasks.on('change', self.changeTask, self);
                app.sprints.getOrFetch(self.sprintId).done(function (sprint) {
                    self.sprint = sprint;
                    self.connectSocket();
                    self.render();
                    // Add any current tasks
                    app.tasks.each(self.addTask, self);
                    // Fetch tasks for the current sprint
                    sprint.fetchTasks();
                }).fail(function (sprint) {
                    self.sprint = sprint;
                    self.sprint.invalid = true;
                    self.render();
                });
                // Fetch unassigned tasks
                app.tasks.getBacklog();
            });
        },
        getContext: function () {
            return {sprint: this.sprint};
        },
        render: function () {
            TemplateView.prototype.render.apply(this, arguments);
            _.each(this.statuses, function (view, name) {
                $('.tasks', this.$el).append(view.el);
                view.delegateEvents();
                view.render();
            }, this);
            _.each(this.tasks, function (view, taskId) {
                var task = app.tasks.get(taskId);
                view.remove();
                this.tasks[taskId] = this.renderTask(task);
            }, this);
        },
        addTask: function (task) {
            if (task.inBacklog() || task.inSprint(this.sprint)) {
                this.tasks[task.get('id')] = this.renderTask(task);
            }
        },
        renderTask: function (task) {
            var view = new TaskItemView({task: task});
            _.each(this.statuses, function (container, name) {
                if (container.sprint == task.get('sprint') &&
                    container.status == task.get('status')) {
                    container.addTask(view);
                }
            });
            view.on('dragstart', function (model) {
                this.socket.send({
                    model: 'task',
                    id: model.get('id'),
                    action: 'dragstart'
                });
            }, this);
            view.on('dragend', function (model) {
                this.socket.send({
                    model: 'task',
                    id: model.get('id'),
                    action: 'dragend'
                });
            }, this);
            view.on('drop', function (model) {
                this.socket.send({
                    model: 'task',
                    id: model.get('id'),
                    action: 'drop'
                });
            }, this);
            view.render();
            return view;
        },
        connectSocket: function () {
            var links = this.sprint && this.sprint.get('links');
            if (links && links.channel) {
                this.socket = new app.Socket(links.channel);
                this.socket.on('task:dragstart', function (task) {
                    var view = this.tasks[task];
                    if (view) {
                        view.lock();
                    }
                }, this);
                this.socket.on('task:dragend task:drop', function (task) {
                    var view = this.tasks[task];
                    if (view) {
                        view.unlock();
                    }
                }, this);
            }
        },
        remove: function () {
            TemplateView.prototype.remove.apply(this, arguments);
            if (this.socket && this.socket.close) {
                this.socket.close();
            }
        },
        changeTask: function (task) {
            var changed = task.changedAttributes(),
                view = this.tasks[task.get('id')];
            if (view && typeof(changed.status) !== 'undefined' ||
                typeof(changed.sprint) !== 'undefined') {
                view.remove();
                this.addTask(task);
            }
        }
    });

    app.views.HomepageView = HomepageView;
    app.views.LoginView = LoginView;
    app.views.HeaderView = HeaderView;
    app.views.SprintView = SprintView;

})(jQuery, Backbone, _, app);
