import os
from ..antigone.check_dissonance import DissonanceChecker

def load_checker():
    genome_path = os.environ.get('GENOME_PATH', 'glyphs/core.yaml')
    with open(genome_path, 'r', encoding='utf-8') as f:
        yml = f.read()
    return DissonanceChecker(yml)
