from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        
        # Asignar string de rol en base a is_staff y is_superuser
        if user.is_superuser:
            token['rol'] = 'admin'
        elif user.is_staff:
            token['rol'] = 'guardia'
        elif user.cursos_profesor.exists():
            token['rol'] = 'profesor'
        else:
            token['rol'] = 'lectura'
            
        token['cursos_profesor'] = list(user.cursos_profesor.values_list('pk', flat=True))
            
        token['is_staff'] = user.is_staff
        token['email'] = user.email or ''
        return token