from abc import ABC, abstractmethod
from typing import Optional


class AuthValidatorInterface(ABC):
    """
    JWT / token validation.
    Implementations: NoAuthValidator, CognitoJWTValidator, IdentityPlatformValidator
    """

    @abstractmethod
    async def validate(self, token: str) -> dict:
        """
        Validate the bearer token.
        Returns decoded claims dict on success.
        Raises: AuthenticationError on invalid/expired token.
        """
        ...

    @abstractmethod
    def get_user_id(self, claims: dict) -> str:
        """Extract canonical user_id from token claims."""
        ...
