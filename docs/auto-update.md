# Auto-update

Tudo já está configurado — código, `tauri.conf.json` (pubkey + endpoint reais),
e `release.yml` (assina o build e gera o `latest.json` que o app consulta).
Falta um passo, que só você pode fazer: cadastrar a chave privada como secret
do repositório no GitHub.

## O que falta: cadastrar os secrets

Vá em **Settings → Secrets and variables → Actions → New repository secret**
no repositório e crie dois secrets:

- `TAURI_SIGNING_PRIVATE_KEY` — conteúdo do arquivo `.key` gerado (veja abaixo)
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — deixe vazio (a chave foi gerada sem senha)

A chave privada foi gerada nesta sessão e entregue a você fora do repositório
(nunca foi commitada). Se você não guardou o valor, gere uma nova:

```bash
npx tauri signer generate -w ~/.tauri/rhm2sspm.key
```

Isso vai gerar um par de chaves novo. Se fizer isso, também precisa atualizar
o `pubkey` em [`tauri.conf.json`](../src-tauri/tauri.conf.json) com a nova
chave pública impressa no terminal (a privada é só pro secret do GitHub,
nunca commitar).

## Depois de cadastrar os secrets

Um release normal (`git tag vX.Y.Z && git push origin vX.Y.Z`) já vai:

1. Buildar e assinar os instaladores de Windows e Linux
2. Gerar e anexar o `latest.json` na release
3. Deixar tudo pronto pro botão "verificar atualizações" do app encontrar

## Testando

Depois do primeiro release assinado e **publicado** (drafts não contam pro
updater), sobe a versão (`version` no `tauri.conf.json` + nova tag) e o botão
de verificar atualizações de uma instalação anterior deve encontrar e
instalar a nova.
