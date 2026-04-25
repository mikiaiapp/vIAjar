import sys
sys.path.insert(0, './backend')
import traceback
try:
    from app.main import app
    print('SUCCESS')
except Exception as e:
    traceback.print_exc()
