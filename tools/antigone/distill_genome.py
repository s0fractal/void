#!/usr/bin/env python3
import sys, re, yaml, hashlib
from pathlib import Path

def normalize(text: str) -> str:
    text = re.sub(r'```[\s\S]*?```', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def extract_axioms(text: str):
    axioms = []
    for m in re.finditer(r'(не нашкодь|harm|суверен|sovereign|integrity|цілісн|гармон)', text, flags=re.I|re.U):
        s = text[max(0, m.start()-60): m.end()+60]
        axioms.append({
            'id': f'axiom_{len(axioms)+1}',
            'text': s.strip(),
            'stance': 'deny',
            'weight': 1.0,
            'match': {'keywords': [m.group(0).lower()]}
        })
    return axioms

def extract_principles(text: str):
    prs = []
    for m in re.finditer(r'(прозор|trace|audit|відповідальн|reciprocity|care)', text, flags=re.I|re.U):
        s = text[max(0, m.start()-50): m.end()+50]
        prs.append({
            'id': f'principle_{len(prs)+1}',
            'text': s.strip(),
            'stance': 'allow',
            'weight': 0.6,
            'match': {'keywords': [m.group(0).lower()]}
        })
    return prs

def main(paths):
    buf = []
    for p in paths:
        buf.append(Path(p).read_text(encoding='utf-8'))
    text = normalize('\n'.join(buf))
    axioms = extract_axioms(text)
    principles = extract_principles(text)
    genome = {'schema': 'antigone.v1', 'axioms': axioms, 'principles': principles}
    yml = yaml.safe_dump(genome, allow_unicode=True, sort_keys=False)
    h = hashlib.sha256(yml.encode('utf-8')).hexdigest()
    print(yml, end='')
    print(f"# genome_sha256: {h}")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('usage: distill_genome.py <dialogs...>', file=sys.stderr)
        sys.exit(1)
    main(sys.argv[1:])
