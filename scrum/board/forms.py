import django_filters

from django.contrib.auth import get_user_model

from .models import Sprint, Task


User = get_user_model()


class NullFilter(django_filters.BooleanFilter):
    """Filter on a field set as null or not."""
    
    def filter(self, qs, value):
        if value is not None:
            return qs.filter(**{'%s__isnull' % self.name: value})
        return qs
        
        
class SprintFilter(django_filters.FilterSet):
    
    end_min = django_filters.DateFilter(name='end', lookup_type='gte')
    end_max = django_filters.DateFilter(name='end', lookup_type='lte')
    
    class Meta:
        model = Sprint
        fields = ('end_min', 'end_max', )


class TaskFilter(django_filters.FilterSet):
    
    backlog = NullFilter(name='sprint')
    
    class Meta:
        model = Task
        fields = ('sprint', 'status', 'assigned', 'backlog', )
        
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.filters['assigned'].extra.update(
        	{'to_field_name': User.USERNAME_FIELD})