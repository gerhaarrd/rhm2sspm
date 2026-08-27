# Ativando auto-update

O código já está todo em vigor (plugins `updater`/`process` registrados, permissões
concedidas, botão "verificar atualizações" no header, fluxo de
download+instalação+relaunch em [`src/lib/updates.ts`](../src/lib/updates.ts)).
`tauri.conf.json` já tem um bloco `plugins.updater` com `pubkey`/`endpoints`
vazios — **necessário**: sem esse bloco (mesmo vazio) o plugin entra em pânico
no arranque em vez de degradar graciosamente. Com ele vazio, o botão sempre
mostra "atualizações não configuradas", o que é esperado e seguro.

Falta, nessa ordem:

## 1. Repositório git com remoto no GitHub

Este diretório ainda não é um repositório git. Para publicar releases,
precisa de `git init`, um repositório no GitHub, e o código enviado (`git push`).

## 2. Par de chaves de assinatura

```bash
npx tauri signer generate -w ~/.tauri/rhm2sspm.key
```

Isso gera uma chave privada (fica em `~/.tauri/rhm2sspm.key`, protegida por
senha — **nunca commitar**) e imprime a chave pública. A privada vai como
secret do GitHub Actions (`TAURI_SIGNING_PRIVATE_KEY` e
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD`); a pública entra no
`tauri.conf.json`:

```jsonc
{
  "plugins": {
    "updater": {
      "pubkey": "<chave pública gerada acima>",
      "endpoints": [
        "https://github.com/<usuario>/<repo>/releases/latest/download/latest.json"
      ]
    }
  }
}
```

## 3. Pipeline de release (GitHub Actions)

A [`tauri-action`](https://github.com/tauri-apps/tauri-action) oficial builda,
assina e publica pra Linux e Windows num único job, disparado por tag
(`v*`). Ela também gera o `latest.json` que os endpoints acima esperam.
Exemplo mínimo de `.github/workflows/release.yml`:

```yaml
name: release
on:
  push:
    tags: ["v*"]

jobs:
  release:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: "rhm2sspm ${{ github.ref_name }}"
          includeUpdaterJson: true
```

## 4. Testar

Depois de um primeiro release publicado com a config acima já presente, sobe
uma versão nova (`version` no `tauri.conf.json` + nova tag) e o botão de
verificar atualizações do app anterior deve encontrar e instalar.
