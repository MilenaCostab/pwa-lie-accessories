# Liê Accessories — Progressive Web App

PWA da loja de acessórios **Liê Accessories**, desenvolvido como projeto final da disciplina de E-business da UFC — Campus Jardins de Anita (Itapajé).

Construído com HTML5, CSS3 e JavaScript puro, sem frameworks, integrado à loja WooCommerce via Store API.

---

## 👥 Integrantes

- Milena Costa
- David Lucas

---

## 📱 Funcionalidades

- Listagem de produtos em tempo real via WooCommerce Store API
- Filtro por categorias (Colares, Brincos, Pulseiras, Anéis)
- Busca de produtos em tempo real
- Carrinho de compras sincronizado com o WooCommerce
- Finalização de compra redirecionando para o checkout do WooCommerce
- Funcionamento offline com Service Worker e cache
- Instalável no dispositivo sem precisar de loja de aplicativos
- Interface responsiva fiel à identidade visual da loja
- Página offline customizada

---

## 🗂️ Estrutura do Projeto

```
pwa-lie-accessories/
├── index.html          # Shell principal do app
├── manifest.json       # Configurações do PWA
├── sw.js               # Service Worker (cache e offline)
├── offline.html        # Página exibida sem conexão
├── css/
│   └── style.css       # Estilos e responsividade
├── js/
│   └── app.js          # Lógica principal e integração com API
└── icons/
    ├── icon-192.png    # Ícone do app (tela inicial)
    └── icon-512.png    # Ícone splash screen
```

## ⚙️ Tecnologias Utilizadas

| Tecnologia | Finalidade |
|---|---|
| HTML5 | Estrutura do app |
| CSS3 | Estilização e responsividade |
| JavaScript ES2022 | Lógica e consumo de API |
| Web App Manifest | Instalabilidade do PWA |
| Service Worker | Cache e modo offline |
| WooCommerce Store API | Produtos e carrinho |
| Git + GitHub | Controle de versão |

---

## ⚠️ Importante — Exibição dos Produtos

> **Os produtos só aparecem quando o app tem acesso à API do WooCommerce.**

O PWA busca os produtos diretamente da loja WooCommerce via:
GET /wp-json/wc/store/v1/products

Para os produtos aparecerem, é necessário que:

1. O **WordPress + WooCommerce** esteja rodando localmente
2. O Apache e MySQL estejam ativos:
```bash
sudo systemctl start apache2
sudo systemctl start mysql
```
3. O endereço da loja no `js/app.js` esteja correto:
```javascript
const CONFIG = {
  url_loja: 'http://SEU_IP_LOCAL',
};
```

Caso esteja **offline ou sem acesso à API**, o app exibe os produtos salvos em cache da última visita. Se nunca tiver acessado online, a mensagem "Nenhum produto encontrado" será exibida.



---

## 📚 Referências

- [MDN — Progressive Web Apps](https://developer.mozilla.org/pt-BR/docs/Web/Progressive_web_apps)
- [MDN — Service Worker API](https://developer.mozilla.org/pt-BR/docs/Web/API/Service_Worker_API)
- [WooCommerce Store API](https://github.com/woocommerce/woocommerce/tree/trunk/plugins/woocommerce/src/StoreApi)
- [Google — Learn PWA](https://web.dev/learn/pwa/)

---

