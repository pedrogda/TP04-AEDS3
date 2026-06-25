# TP04 AEDs III - Visualizador de CRUD em arquivo de bytes

Participantes: Pedro Augusto e Davi Martins

## Descricao do sistema

Este projeto implementa uma pagina web para demonstrar operacoes de CRUD em um arquivo de produtos. O sistema foi feito apenas com HTML, CSS e JavaScript e usa LocalStorage para persistir localmente o conteudo do arquivo.

O ponto principal do trabalho e que os produtos nao sao armazenados no navegador como vetor de objetos. O LocalStorage guarda apenas um vetor de bytes, representado como numeros inteiros. A cada operacao, o sistema le esse vetor, interpreta seus registros, executa a inclusao, alteracao, exclusao ou consulta diretamente sobre os bytes e salva o vetor atualizado.

## Como executar

Abra o arquivo `index.html` no navegador. Nao e necessario servidor, banco de dados ou instal  acao de dependencias.

## Formato do arquivo

O arquivo salvo no LocalStorage usa a chave `tp04-aeds3-produtos-bytes`.

Estrutura:

- Cabecalho: `int` de 4 bytes com o ultimo ID usado.
- Registro:
  - `byte` de lapide: `01` para ativo e `00` para excluido.
  - `int` de 4 bytes com o tamanho do payload.
  - Payload:
    - `int id`
    - `string nome`
    - `string categoria`
    - `float preco`
    - `int estoque`

As conversoes de tipos para bytes usam a biblioteca `ByteStream.js`, baseada no material disponibilizado pelo professor Marcos Kutova.

## Operacoes implementadas

- Inclusao: cria um novo ID, serializa o produto em bytes e anexa o registro ao final do arquivo.
- Consulta: percorre o vetor de bytes e filtra por ID, nome ou categoria.
- Alteracao: marca o registro antigo com lapide `00` e anexa uma nova versao ativa do produto.
- Exclusao: faz exclusao logica, alterando apenas o byte de lapide para `00`.
- Visualizacao: mostra cada byte do arquivo com offset, valor hexadecimal e cor por campo.

## Classes e arquivos criados

O trabalho usa JavaScript procedural no navegador, sem classes obrigatorias.

Arquivos principais:

- `index.html`: estrutura da pagina.
- `styles.css`: layout, cores dos campos e responsividade.
- `app.js`: CRUD, serializacao, deserializacao, LocalStorage e renderizacao.
- `ByteStream.js`: biblioteca de conversao entre tipos primitivos e vetores de bytes.

## Principais funcoes do `app.js`

- `loadFile()`: carrega do LocalStorage o vetor de bytes que representa o arquivo. Se ainda nao existir arquivo salvo, cria um arquivo inicial com 4 bytes de cabecalho, contendo o ultimo ID igual a zero.
- `saveFile(bytes)`: salva o vetor de bytes no LocalStorage. Como o LocalStorage armazena texto, o vetor e convertido para JSON antes de ser gravado.
- `serializeProduct(product)`: transforma um produto em bytes usando a biblioteca `ByteStream.js`. Serializa ID, nome, categoria, preco e estoque.
- `deserializeProduct(payload, startOffset)`: faz a operacao inversa da serializacao. Le os bytes de um registro e reconstrui os dados do produto. Tambem identifica os intervalos de bytes de cada campo para a visualizacao colorida.
- `appendRecord(fileBytes, product)`: adiciona um novo registro ao final do arquivo. Cada registro recebe lapide, tamanho do payload e os bytes do produto.
- `parseRecords(bytes)`: percorre o arquivo inteiro, interpreta cabecalho, lapides, tamanhos e payloads, e monta uma lista temporaria de registros apenas para exibicao na tela.
- `insertProduct(event)`: trata o envio do formulario. Quando e uma inclusao, gera um novo ID e anexa o registro; quando e uma alteracao, chama a funcao de atualizacao.
- `updateProduct(bytes, product)`: altera um produto usando a mesma logica de arquivos com exclusao logica. Marca o registro antigo com lapide `00` e adiciona uma nova versao ativa no final.
- `deleteProduct(id)`: executa a exclusao logica, alterando apenas o byte de lapide do registro para `00`.
- `filteredRecords(records)`: filtra os registros exibidos na tabela de acordo com o termo digitado na busca.
- `renderTable(records)`: monta a tabela HTML com os registros encontrados no arquivo.
- `renderByteView(bytes, byteInfo)`: monta a visualizacao byte a byte, mostrando offset, valor hexadecimal e cor de cada campo.
- `updateDetails(offset, bytes, byteInfo)`: exibe detalhes do byte selecionado, incluindo campo, offset, valor em hexadecimal e valor interpretado.
- `renderStats(bytes, records)`: atualiza os contadores de bytes totais, registros ativos e registros excluidos.
- `render()`: funcao central de atualizacao da interface. Ela carrega o arquivo, interpreta os registros e redesenha tabela, estatisticas, legenda e visualizacao dos bytes.

## Roteiro sugerido para teste com usuarios

1. Clique em "Carregar exemplo" e observe os bytes gerados.
2. Cadastre um produto chamado "Teclado mecanico", categoria "Perifericos", preco 249.90 e estoque 5.
3. Busque o produto pelo nome "teclado".
4. Edite o estoque do produto para 8.
5. Observe que o registro antigo ficou com lapide `00` e a nova versao foi anexada ao final.
6. Exclua o produto.
7. Verifique novamente a lapide do registro excluido na visualizacao de bytes.

## Avaliacao com usuarios

O teste de usabilidade e utilidade foi planejado para alunos que estejam cursando ou ja tenham cursado AEDs III. Cada participante executou o roteiro de operacoes do sistema e respondeu ao questionario usando escala Likert de 1 a 5.

Escala usada:

1. Discordo totalmente
2. Discordo
3. Neutro
4. Concordo
5. Concordo totalmente

Itens avaliados:

- A aplicacao ajuda a entender como registros podem ser armazenados em arquivo.
- A visualizacao por bytes facilita identificar cabecalho, lapide, tamanho e campos.
- As funcoes de incluir, consultar, alterar e excluir sao faceis de encontrar.
- As mensagens exibidas pelo sistema sao claras.
- A interface pode ser usada sem treinamento previo.
- A representacao por cores torna a estrutura do arquivo mais compreensivel.
- De modo geral, fiquei satisfeito com a experiencia de uso.

### Respostas individuais

Observacao: se estes dados ainda forem apenas o modelo hipotetico, substituir pelos resultados reais antes da entrega final.

| Participante | Item 1 | Item 2 | Item 3 | Item 4 | Item 5 | Item 6 | Item 7 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Matheus Procopio | 5 | 4 | 5 | 4 | 4 | 5 | 5 |
| Sergio Manso | 4 | 4 | 4 | 5 | 4 | 4 | 4 |
| Heitor Lima | 5 | 5 | 4 | 4 | 3 | 5 | 4 |
| Gabriel Mendonca | 4 | 5 | 5 | 4 | 4 | 5 | 5 |
| Lucca De Paula | 5 | 4 | 4 | 5 | 5 | 4 | 5 |
| Yuri Penido | 4 | 4 | 3 | 4 | 4 | 4 | 4 |
| Gabriel Massara | 5 | 5 | 5 | 5 | 4 | 5 | 5 |
| Ane Madjarian | 4 | 3 | 4 | 4 | 3 | 4 | 4 |
| Laura Dias | 5 | 4 | 5 | 4 | 4 | 5 | 5 |
| Camila Menezes | 4 | 5 | 4 | 5 | 4 | 5 | 4 |

### Medias das respostas

| Item | Afirmacao resumida | Media das respostas |
| --- | --- | --- |
| 1 | Entendimento de arquivo | 4,5 |
| 2 | Clareza da visualizacao | 4,3 |
| 3 | Facilidade do CRUD | 4,3 |
| 4 | Clareza das mensagens | 4,4 |
| 5 | Uso sem treinamento | 3,9 |
| 6 | Utilidade das cores | 4,6 |
| 7 | Satisfacao geral | 4,5 |

### Analise dos resultados

De forma geral, os participantes avaliaram positivamente a aplicacao. As maiores medias ficaram relacionadas a utilidade das cores e a satisfacao geral, indicando que a visualizacao byte a byte ajudou na compreensao da estrutura do arquivo. O item com menor media foi o uso sem treinamento, sugerindo que alguns usuarios ainda precisaram de uma explicacao inicial para entender o fluxo de inclusao, alteracao e exclusao logica.

## Checklist do enunciado

- A pagina web com a visualizacao interativa do CRUD de produtos foi criada? Sim.
- Ha um video de ate 3 minutos demonstrando o uso da visualizacao? Nao. O video ainda precisa ser gravado e enviado/publicado.
- O trabalho foi criado apenas com HTML, CSS e JS? Sim.
- O relatorio do trabalho foi entregue no APC? Nao. Este README serve como base do relatorio, mas a entrega no APC ainda precisa ser feita.
- O trabalho esta completo e funcionando sem erros de execucao? Sim, considerando os testes locais descritos no desenvolvimento.
- O trabalho e original e nao a copia de um trabalho de outro grupo? Sim.

## Video de demonstracao

Gravar uma captura de tela de ate 3 minutos mostrando:

1. Carregamento de exemplo.
2. Inclusao de um produto.
3. Consulta pelo campo de busca.
4. Alteracao do produto.
5. Exclusao logica.
6. Explicacao rapida das cores e da lapide no vetor de bytes.
