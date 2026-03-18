from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from django.contrib.auth.models import User
from rest_framework import serializers
from .views import CustomPageNumberPagination


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_staff', 'is_superuser', 'is_active', 'date_joined', 'password']
        read_only_fields = ['date_joined']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            raise serializers.ValidationError({'password': 'La contraseña es obligatoria.'})
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class UsuariosViewSet(viewsets.ModelViewSet):
    """CRUD de usuarios del sistema. Solo accesible por administradores (is_staff)."""
    queryset = User.objects.all().order_by('username')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    pagination_class = CustomPageNumberPagination

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user == request.user:
            return Response(
                {'error': 'No podés eliminar tu propio usuario.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'], url_path='cambiar_password')
    def cambiar_password(self, request, pk=None):
        user = self.get_object()
        nueva = request.data.get('password', '')
        if not nueva or len(nueva) < 4:
            return Response(
                {'error': 'La contraseña debe tener al menos 4 caracteres.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.set_password(nueva)
        user.save()
        return Response({'status': 'Contraseña actualizada correctamente.'})

    @action(detail=False, methods=['post'], url_path='cambiar_mi_password', permission_classes=[IsAuthenticated])
    def cambiar_mi_password(self, request):
        user = request.user
        actual = request.data.get('password_actual', '')
        nueva = request.data.get('nueva_password', '')
        confirmar = request.data.get('confirmar_password', '')

        if not actual:
            return Response(
                {'error': 'Debe ingresar su contraseña actual.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if not user.check_password(actual):
            return Response(
                {'error': 'La contraseña actual es incorrecta.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not nueva or len(nueva) < 6:
            return Response(
                {'error': 'La nueva contraseña debe tener al menos 6 caracteres.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if nueva != confirmar:
            return Response(
                {'error': 'Las contraseñas nuevas no coinciden.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(nueva)
        user.save()
        return Response({'status': 'Tu contraseña ha sido actualizada correctamente.'})
