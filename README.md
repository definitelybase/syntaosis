# synTAOsis

synTAOsis is a principal-first protocol/product prototype focused on one central intelligence that defines intent, evaluates execution, and keeps downstream surfaces secondary until launch is real.

## Structure

- `nexus-site/` — multi-page localhost product/protocol interface
- `docs/` — wireframes, pitch deck, and whitepaper drafts
- `nft_contract_abi.json` — local ABI artifact used in earlier experiments
- `ads (1).py`, `main.py` — legacy local scripts kept in the repo

## Local Run

```bash
cd nexus-site
python3 server.py --port 4180
```

Then open `http://127.0.0.1:4180`.

## Notes

- Secrets and local wallet files are intentionally excluded from git.
- Contract addresses on the protocol pages are currently `TBA`.
