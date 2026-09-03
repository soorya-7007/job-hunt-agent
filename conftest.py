# Ensures the project root is on sys.path so `import app...` works under pytest.
import warnings

warnings.filterwarnings("ignore", category=RuntimeWarning, message=".*duckduckgo_search.*")
