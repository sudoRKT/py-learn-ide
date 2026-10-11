"""Placeholder so `npm run test:py` has something to run until the Python runtime exists."""

import sys


def test_python_is_new_enough():
    assert sys.version_info >= (3, 11)


def test_bundled_packages_are_importable():
    import pytest  # noqa: F401
    import requests  # noqa: F401
