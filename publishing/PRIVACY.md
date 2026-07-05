# Política de Privacidade — ZeroDelay

**Última atualização:** 05/07/2026

O ZeroDelay ("a extensão") é uma extensão de navegador que reduz a latência das
lives do YouTube ajustando a reprodução para que o player alcance o ao vivo.

## Resumo

**O ZeroDelay não coleta, transmite, vende nem compartilha nenhum dado pessoal.**
Não há analytics, não há rastreamento e não há servidores nossos. Tudo o que a
extensão guarda fica no seu próprio dispositivo. A única comunicação de rede é
uma consulta pública ao **próprio YouTube** para listar os jogos ao vivo (veja
"Descoberta de jogos ao vivo" abaixo) — nenhum outro serviço é contatado.

## O que é armazenado, e onde

Todos os dados ficam localmente no seu dispositivo, usando a API `storage.local`
do navegador. Nada sai do seu computador.

| Dado | Por que existe |
| --- | --- |
| Suas configurações (modo escolhido e indicadores no player) | Para lembrar como você configurou a extensão. |
| Tempo de uso anônimo (segundos totais de uso e a data da primeira execução) | Apenas para decidir quando mostrar um lembrete opcional e dispensável de "me pague um café". |
| Estado do lembrete (sinalizadores de "lembrar depois" / "não mostrar novamente") | Para respeitar a sua escolha sobre esse lembrete. |

Esses dados são anônimos, não estão ligados à sua identidade e nunca são enviados
a lugar nenhum. O botão "Restaurar padrões" limpa suas configurações; as suas
escolhas sobre o lembrete são preservadas de propósito, para que você não seja
perguntado de novo.

## Doações

O recurso opcional de doação gera um código PIX "copia e cola" e um QR Code
**inteiramente no seu dispositivo**. Nenhuma informação de pagamento passa pela
extensão e nenhum dado de doação é coletado. Se você optar por doar, o pagamento
acontece no app do seu próprio banco, fora da extensão.

## Descoberta de jogos ao vivo

O popup mostra uma seção **"Jogos ao vivo"** com transmissões oficiais de futebol
que estão ao vivo no YouTube. Para montar essa lista, a extensão faz **uma
consulta à busca pública do YouTube** (`youtube.com`) — a mesma que qualquer
pessoa faz no site.

- A consulta acontece **somente quando você abre o popup** (nunca em segundo
  plano) e o resultado fica em cache local por alguns minutos.
- A requisição é enviada **sem cookies e sem login** (`credentials: 'omit'`), ou
  seja, não vai atrelada à sua conta do YouTube.
- Vai **apenas ao YouTube** — nenhum servidor nosso e nenhum terceiro. As
  miniaturas dos vídeos são carregadas do YouTube (`i.ytimg.com`), como em
  qualquer página do site.
- Nenhum dado novo é coletado ou transmitido; só a lista de jogos é guardada
  localmente, em cache, para o popup abrir rápido.

## Permissões

- **storage** — para salvar localmente as configurações e os contadores
  descritos acima (e o cache curto da lista de jogos ao vivo).
- **alarms** — para agendar a verificação local que decide se deve mostrar o
  lembrete opcional de doação.
- **Acesso a `youtube.com`** (host permission) — para (1) rodar o script de
  controle de latência nas páginas do YouTube e (2) consultar a busca pública do
  YouTube, ao abrir o popup, para listar os jogos ao vivo. Ela não lê sua conta,
  seu histórico nem qualquer informação pessoal.

## Código remoto

O ZeroDelay **não carrega nenhum código remoto**. Todos os scripts, incluindo o
gerador de QR Code, vêm empacotados dentro da extensão, em conformidade com o
Manifest V3.

## Alterações

Se esta política mudar, a data de "Última atualização" acima será revisada.

## Contato

Dúvidas sobre privacidade: **joao@solitus.com.br** (João Gustavo França,
<https://github.com/joaogfc>).
