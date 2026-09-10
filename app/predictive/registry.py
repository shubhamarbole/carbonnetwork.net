"""
Predictive Model Registry
Phase 9: Tracks model versions, training timestamps, dataset versions,
evaluation metrics, and approval/deployment states.
"""

import os
import json
import logging
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timezone
import joblib

from app.schemas.prediction import ModelMetadata, ModelEvaluationMetrics
from app.predictive.training import default_model_trainer
from app.predictive.features import FEATURE_VERSION

logger = logging.getLogger("predictive_registry")

DEFAULT_MODEL_VERSION = "risk-predictor-v1"
MODELS_DIR = os.getenv("PREDICTIVE_MODELS_DIR", "./models")


class ModelRegistry:
    """Manages lifecycle of predictive risk models."""

    def __init__(self, models_dir: str = MODELS_DIR):
        self.models_dir = models_dir
        self._models: Dict[str, Any] = {}
        self._metadata: Dict[str, ModelMetadata] = {}
        self.active_version = DEFAULT_MODEL_VERSION
        os.makedirs(self.models_dir, exist_ok=True)
        self._ensure_default_model()

    def _ensure_default_model(self) -> None:
        """Loads default model from disk or trains and registers baseline."""
        model_path = os.path.join(self.models_dir, f"{DEFAULT_MODEL_VERSION}.joblib")
        meta_path = os.path.join(self.models_dir, f"{DEFAULT_MODEL_VERSION}_meta.json")

        if os.path.exists(model_path) and os.path.exists(meta_path):
            try:
                self._models[DEFAULT_MODEL_VERSION] = joblib.load(model_path)
                with open(meta_path, "r") as f:
                    meta_dict = json.load(f)
                    self._metadata[DEFAULT_MODEL_VERSION] = ModelMetadata(**meta_dict)
                logger.info(f"Loaded existing predictive model: {DEFAULT_MODEL_VERSION}")
                return
            except Exception as err:
                logger.warning(f"Failed to load cached model ({err}), retraining default model...")

        # Train and register baseline model
        self.train_and_register(
            model_version=DEFAULT_MODEL_VERSION,
            dataset_version="dataset-esg-baseline-v1"
        )

    def train_and_register(
        self,
        model_version: str,
        dataset_version: str = "dataset-esg-v1",
        force_type: Optional[str] = None
    ) -> ModelMetadata:
        """Trains, registers, and serializes a new model version."""
        logger.info(f"Training predictive model version {model_version}...")
        results = default_model_trainer.train_and_evaluate()

        model_type = force_type or results["chosen_model_type"]
        model_obj = results["chosen_model"] if (not force_type or force_type == results["chosen_model_type"]) else results["baseline_lr_model"]
        metrics = results["chosen_metrics"] if (not force_type or force_type == results["chosen_model_type"]) else results["baseline_lr_metrics"]

        now_str = datetime.now(timezone.utc).isoformat()
        metadata = ModelMetadata(
            model_version=model_version,
            model_type=model_type,
            feature_version=FEATURE_VERSION,
            training_timestamp=now_str,
            dataset_version=dataset_version,
            status="DEPLOYED",
            metrics=metrics
        )

        # Cache in memory
        self._models[model_version] = model_obj
        self._metadata[model_version] = metadata
        self.active_version = model_version

        # Persist to disk
        try:
            model_path = os.path.join(self.models_dir, f"{model_version}.joblib")
            meta_path = os.path.join(self.models_dir, f"{model_version}_meta.json")
            joblib.dump(model_obj, model_path)
            with open(meta_path, "w") as f:
                f.write(metadata.model_dump_json(indent=2))
            logger.info(f"Successfully serialized {model_version} to {model_path}")
        except Exception as err:
            logger.warning(f"Could not persist model to disk ({err}). Active in-memory only.")

        return metadata

    def get_model(self, version: Optional[str] = None) -> Tuple[Any, ModelMetadata]:
        """Retrieves model object and metadata."""
        ver = version or self.active_version
        if ver not in self._models:
            raise KeyError(f"Predictive model version '{ver}' not found in registry.")
        return self._models[ver], self._metadata[ver]

    def list_models(self) -> List[ModelMetadata]:
        """Returns metadata for all registered models."""
        return list(self._metadata.values())

    def get_active_version(self) -> str:
        return self.active_version

    def get_active_model(self) -> Tuple[Any, ModelMetadata]:
        return self.get_model(self.active_version)


default_model_registry = ModelRegistry()
