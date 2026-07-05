# Chrome Web Store — Conteúdo da listagem (ZeroDelay)

Copie e cole nos campos do Painel do Desenvolvedor. Os itens marcados com
**[você fornece]** precisam de um arquivo ou URL que só você pode dar (imagem ou
página hospedada).

---

## Aba "Loja" (Store listing)

**Nome do item:** ZeroDelay

**Resumo / descrição curta** (máx. 132 caracteres — já usado como `description`
no manifesto, localizado):

- Português (BR): `Sincroniza lives do YouTube em tempo real, acelerando a reprodução para reduzir o atraso e manter você perto do ao vivo.`
- Inglês (padrão): `This extension syncs YouTube live streams in real-time by accelerating viewer-delayed streams caused by data reception delays.`

> O resumo no painel usa, por padrão, o `description` do manifesto. Os textos
> acima já batem com `_locales/*/messages.json`.

**Descrição detalhada** (sugestão em português):

```
Cansado de assistir lives do YouTube com segundos (às vezes minutos) de atraso?
O ZeroDelay mantém você perto do tempo real.

Quando uma transmissão ao vivo com DVR começa a ficar para trás, o ZeroDelay
aumenta de leve a velocidade de reprodução (suaves 1,25x) para consumir o
conteúdo já baixado e te trazer de volta ao ao vivo — o que reduz a latência.
Depois descansa em 1,0x, que segura o ganho. Ou seja: ele age em rajadas curtas,
só quando você fica para trás, sem ficar acelerado o tempo todo.

POR QUE INSTALAR
• Volte ao tempo real — pare de receber spoilers no chat antes de ver o lance.
• Funciona sozinho — escolha um modo uma vez e esqueça.
• Inteligente e gentil — acelera só o necessário e nunca quando o buffer está
  baixo, evitando travadas.
• Leve e privado — sem coleta de dados, sem servidores nossos, sem código
  remoto. A única comunicação de rede é uma consulta pública ao próprio YouTube
  (só ao abrir o popup) para listar os jogos ao vivo.

RECURSOS
• Modos de um toque — da recuperação suave (internet fraca) à latência mínima.
• Modo Automático (padrão) — mede sua conexão e se ajusta sozinho.
• Cada modo mostra a internet ideal para ele.
• Pulo para o ao vivo opcional, quando o atraso fica grande demais.
• Indicadores opcionais no player — velocidade, latência ao vivo e saúde do
  buffer, ao lado do selo AO VIVO, inclusive em tela cheia.
• Funciona também no player incorporado do YouTube.
• Jogos ao vivo — o popup lista as transmissões OFICIAIS de futebol que estão ao
  vivo no YouTube (com miniatura e canal), filtrando re-streams e transmissões
  fake. Um clique te leva direto à live, onde o ZeroDelay já segura a latência.

PRIVACIDADE
O ZeroDelay não coleta dados pessoais, não tem analytics e não carrega código
remoto. Todas as configurações ficam no seu dispositivo.

Observação técnica: as lives modernas do YouTube ("SABR / manifestless") ignoram
mudanças diretas de velocidade no vídeo; o ZeroDelay usa a API setPlaybackRate()
do próprio player, que é o que realmente faz a recuperação funcionar nelas.
```

**Categoria (principal):** Entretenimento  _(alternativa: Funcionalidades e UI)_

**Idiomas:** Português (Brasil) e Inglês (padrão), via `_locales`.

**Recursos gráficos — [você fornece]:**

| Recurso | Especificação | Observações |
| --- | --- | --- |
| Ícone da loja | **128×128** PNG | Pode reusar `icons/128.png`. |
| Captura(s) de tela | **1280×800** PNG/JPEG, 1 a 5 | Prontas em `publishing/assets/screenshot-1..3.png`. |
| Bloco promocional pequeno | **440×280** PNG/JPEG | Pronto em `publishing/assets/small-tile.png`. |
| Bloco promocional de letreiro | **1400×560** PNG/JPEG | Pronto em `publishing/assets/marquee.png` (opcional). |
| Vídeo promocional | URL do YouTube | Opcional. |

---

## Aba "Privacidade"

**Único propósito** (colar):

```
O ZeroDelay reduz a latência de transmissões ao vivo do YouTube ajustando a
velocidade de reprodução (e, opcionalmente, pulando para o ao vivo) para manter o
player perto da borda ao vivo. Também mostra, no popup, os jogos oficiais que
estão ao vivo no YouTube, consultando a busca pública do próprio site.
```

**Justificativas de permissão** (colar cada uma):

- **storage**:
  `Salva localmente as configurações do usuário (modo, indicadores) e pequenos contadores anônimos. Nenhum dado é transmitido.`
- **alarms**:
  `Agenda uma verificação local periódica que decide se deve mostrar um lembrete de doação opcional e dispensável. Não é usada para atividade de rede em segundo plano.`
- **Acesso a https://www.youtube.com/ (content script + host permission)**:
  `Usado para dois fins: (1) o content script roda no YouTube para ler as estatísticas de latência e buffer do player e ajustar a velocidade de reprodução; (2) ao abrir o popup, a extensão consulta a busca pública do YouTube para listar os jogos oficiais ao vivo. A consulta vai apenas ao YouTube, sem cookies/login, e não acessa conta, histórico nem dados pessoais.`

**Você está usando código remoto?** → **Não.**
`Todo o JavaScript está empacotado na extensão, incluindo o gerador de QR Code (vendor/qrcode.js). Nenhum código remoto é carregado (compatível com Manifest V3).`

**Uso de dados:** declare que a extensão **não** coleta nenhuma das categorias
listadas (informações pessoais, saúde, financeiras, autenticação, comunicações,
local, histórico da web, atividade do usuário, conteúdo do site). Em seguida,
marque as três certificações.

**URL da Política de Privacidade — [você fornece]:** publique `publishing/PRIVACY.md`
em algum lugar público (repositório GitHub, GitHub Pages ou Gist) e cole a URL.
Sugestão (este repositório): `https://github.com/joaogfc/ZeroDelay/blob/main/publishing/PRIVACY.md`

---

## Aba "Distribuição"

- **Visibilidade:** Pública (ou Não listada enquanto testa).
- **Preço:** Grátis.
- **Regiões:** Todas, ou restrinja como preferir.
