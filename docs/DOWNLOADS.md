# Verified downloads

Checked 11 October 2026. CI must verify every file by SHA-256, not by size. Sizes for python.org and GitHub assets are the rounded figures shown on the page.

## Bundled in the installer

| What | Version | URL | SHA-256 |
|---|---|---|---|
| CPython embeddable, Windows x64 | 3.14.8 | `https://www.python.org/ftp/python/3.14.8/python-3.14.8-embed-amd64.zip` | `a93abe456ab01bd96d7a085b3cdb6566b3063f4241360d114142fbdb07f0a310` |
| llama.cpp, Windows x64 Vulkan | b11557 | `https://github.com/ggml-org/llama.cpp/releases/download/b11557/llama-b11557-bin-win-vulkan-x64.zip` | `6db23c5cf69e51f3dc2bf7f68277f4a791217bab853bd5b93afac1898d450b83` |
| MinGit 64-bit | 2.56.0.2 | `https://github.com/git-for-windows/git/releases/download/v2.56.0.windows.2/MinGit-2.56.0.2-64-bit.zip` | `da35e72aa21c005a5a0d298cfbae110bc1609a815730ea0dde84b01a1b3cd3be` |

### Python

- `python314._pth` ships as `python314.zip`, `.`, blank, then `#import site`. Change `#import site` to `import site` and add a line `Lib\site-packages`.
- The embeddable build has no pip, venv, tkinter or turtle. `help()` works once `import site` is on.
- Add packages at build time with a matching interpreter (actions/setup-python 3.14 x64):

```
python -m pip install --target <python dir>\Lib\site-packages --only-binary=:all: --platform any --implementation py --abi none --python-version 3.14 requests pytest colorama
```

  This resolves to eleven pure-Python wheels: requests, charset-normalizer, idna, urllib3, certifi, pytest, colorama, iniconfig, packaging, pluggy, pygments.
- Licence: PSF. Keep `LICENSE.txt` from the zip.

### llama.cpp

- Copy `llama-server.exe` and every `*.dll` from the zip root. Do not hard-code the DLL list. The Windows zip has no licence file; ship `LICENSE` (MIT) from the repo at the tag.
- Launch: `llama-server.exe -m <model.gguf> --host 127.0.0.1 --port <free port> -c 8192 -ngl auto -np 1 --jinja --reasoning off --no-webui`
- Always pass `--port` and `-c`. The default context is the model's own, which is 262144 for some models.
- Health: `GET /health` returns 503 while loading, then 200 `{"status":"ok"}`.
- Chat: `POST /v1/chat/completions` with `"stream": true` (server-sent events). To switch thinking off per request add `"chat_template_kwargs": {"enable_thinking": false}`.
- `llama-server.exe --list-devices` prints the devices the Vulkan backend can use, then exits. Its output format is not confirmed: parse defensively.
- If start-up with the GPU fails, retry with `-ngl 0`.

### Git

- Call `cmd\git.exe` inside MinGit. Never hard-code `mingw64` or `ucrt64`.
- MinGit includes Git Credential Manager but does not switch it on: pass `-c credential.helper=manager` for push and pull.
- Licence: GPLv2. Keep `LICENSE.txt` from the zip and link to the source for the tag in the app's licences page.

## Downloaded on first launch (models)

URL pattern: `https://huggingface.co/<repo>/resolve/main/<file>`. None is gated. No request to a `resolve` URL could be made from the build workspace, so the first real download happens on the owner's PC.

| Tier | Role | Model | Repo | File | Bytes | SHA-256 | Licence | Thinking mode |
|---|---|---|---|---|---|---|---|---|
| small | default | Phi-4-mini-instruct Q4_K_M | `unsloth/Phi-4-mini-instruct-GGUF` | `Phi-4-mini-instruct-Q4_K_M.gguf` | 2491874272 | `88c00229914083cd112853aab84ed51b87bdf6b9ce42f532d8c85c7c63b1730a` | MIT | none |
| small | alternative | Qwen3.5-2B Q6_K | `unsloth/Qwen3.5-2B-GGUF` | `Qwen3.5-2B-Q6_K.gguf` | 1574961408 | `fc90339420b4298887aafb307a4291c55440b730133bbffe6ba9630503dcb548` | Apache-2.0 | must be off |
| medium | default | Qwen2.5-Coder-7B-Instruct q4_k_m | `Qwen/Qwen2.5-Coder-7B-Instruct-GGUF` | `qwen2.5-coder-7b-instruct-q4_k_m.gguf` | 4683073536 | `509287f78cb4d4cf6b3843734733b914b2c158e43e22a7f4bf5e963800894d3c` | Apache-2.0 | none |
| medium | alternative | Qwen3.5-4B Q6_K | `unsloth/Qwen3.5-4B-GGUF` | `Qwen3.5-4B-Q6_K.gguf` | 3525956768 | `fdedd781c9ce676ab66b018ca247ff78e8a33c98098a822c1e2d5075e7718f66` | Apache-2.0 | must be off |
| large | default | Qwen3.5-9B Q5_K_M | `unsloth/Qwen3.5-9B-GGUF` | `Qwen3.5-9B-Q5_K_M.gguf` | 6577841376 | `dc2a39aef291f91a9116ad214058da0d86eb648743a124bd8c333787c4b9c91c` | Apache-2.0 | must be off |
| large | alternative | Gemma 4 12B QAT q4_0 | `google/gemma-4-12B-it-qat-q4_0-gguf` | `gemma-4-12b-it-qat-q4_0.gguf` | 6975879296 | `93567e57a8fe10b23569b9d9ec38cd005deedf71e29477c421a4b83f418a538b` | Apache-2.0 (card) | must be off |

Context sizes in the files: Phi-4-mini 131072, Qwen2.5-Coder-7B 131072, Qwen3.5 262144, Gemma 4 12B 262144. The app always runs with `-c 8192`.

Sampling from the model cards: Qwen3.5 temperature 0.7, top_p 0.8, top_k 20. For the others use temperature 0.4 for tutor comments.

Do not ship Qwen2.5-Coder-3B: its licence is research-only.

The defaults are a judgement from size, age and licence. Nothing has been benchmarked. The test on real beginner mistakes on the owner's hardware decides the final pick per tier.

## Graphics card detection on Windows, no admin rights

Untested (no Windows machine in the build workspace). Use the bundled `llama-server.exe --list-devices` first, then the registry as a cross-check, then CIM for names.

Registry (name and 64-bit VRAM):

```
powershell -NoProfile -Command "$k='HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}'; $r=@(Get-ChildItem $k -ErrorAction SilentlyContinue | Where-Object { $_.PSChildName -match '^\d{4}$' } | ForEach-Object { $p=Get-ItemProperty $_.PSPath; if ($p.DriverDesc) { [pscustomobject]@{ name=$p.DriverDesc; vendor=$p.ProviderName; vramBytes=[uint64]($p.'HardwareInformation.qwMemorySize'); driverVersion=$p.DriverVersion } } }); ConvertTo-Json -InputObject $r -Compress"
```

CIM (names only; `AdapterRAM` caps at 4 GB):

```
powershell -NoProfile -Command "$r=@(Get-CimInstance Win32_VideoController | Select-Object Name,AdapterCompatibility,DriverVersion,@{n='adapterRamBytes';e={[uint64]$_.AdapterRAM}}); ConvertTo-Json -InputObject $r -Compress"
```
