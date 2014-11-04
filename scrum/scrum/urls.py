from django.conf.urls import include, url

from rest_framework.authtoken.views import obtain_auth_token


urlpatterns = [
    url(r'^api/token/', obtain_auth_token, name='api-token'),
]
