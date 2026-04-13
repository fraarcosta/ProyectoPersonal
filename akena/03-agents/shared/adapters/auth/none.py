from shared.interfaces import AuthValidatorInterface


class NoAuthValidator(AuthValidatorInterface):
    """
    Dev-only auth validator — accepts any token (or no token).
    Never use in production. Swap for CognitoJWTValidator or similar.
    """

    async def validate(self, token: str) -> dict:
        return {"sub": "dev-user", "email": "dev@akena.local", "auth": "none"}

    def get_user_id(self, claims: dict) -> str:
        return claims.get("sub", "dev-user")
