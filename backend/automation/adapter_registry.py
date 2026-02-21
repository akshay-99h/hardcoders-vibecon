"""
Adapter Registry
Central registration system for all portal adapters
"""
from typing import Dict, Optional, Type
from automation.adapter_interface import PortalAdapter


class AdapterRegistry:
    """
    Registry for managing portal adapters
    Supports dynamic registration and retrieval
    """
    
    def __init__(self):
        self._adapters: Dict[str, Type[PortalAdapter]] = {}
    
    def register(self, adapter_class: Type[PortalAdapter]) -> None:
        """
        Register a new adapter
        
        Args:
            adapter_class: Adapter class (not instance)
        """
        # Create temporary instance to get key
        instance = adapter_class()
        key = instance.adapter_key
        
        if key in self._adapters:
            raise ValueError(f"Adapter '{key}' already registered")
        
        self._adapters[key] = adapter_class
        print(f"✓ Registered adapter: {key} ({instance.display_name})")
    
    def get(self, adapter_key: str) -> Optional[Type[PortalAdapter]]:
        """
        Get adapter class by key
        
        Returns:
            Adapter class or None if not found
        """
        return self._adapters.get(adapter_key)
    
    def get_instance(self, adapter_key: str) -> Optional[PortalAdapter]:
        """
        Get new adapter instance by key
        
        Returns:
            Adapter instance or None if not found
        """
        adapter_class = self.get(adapter_key)
        if adapter_class:
            return adapter_class()
        return None
    
    def list_all(self) -> Dict[str, Dict[str, str]]:
        """
        List all registered adapters with metadata
        
        Returns:
            Dict of adapter_key -> {display_name, description, required_fields}
        """
        result = {}
        for key, adapter_class in self._adapters.items():
            instance = adapter_class()
            result[key] = {
                "display_name": instance.display_name,
                "description": instance.description,
                "required_fields": instance.required_fields
            }
        return result
    
    def is_registered(self, adapter_key: str) -> bool:
        """Check if adapter is registered"""
        return adapter_key in self._adapters


# Global registry instance
registry = AdapterRegistry()


def get_registry() -> AdapterRegistry:
    """Get global adapter registry"""
    return registry
