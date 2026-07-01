const CONFIG = {
  url_loja: 'http://192.168.0.7',
  produtos_por_pagina: 12,
};

let carrinho = [];
let todos_os_produtos = [];
let evento_instalacao = null;


document.addEventListener('DOMContentLoaded', () => {
  registrarServiceWorker();
  carregarProdutos();
  verificarConexao();
  configurarBotaoInstalar();
  carregarCarrinhoDoStorage();
});


async function registrarServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registro = await navigator.serviceWorker.register('sw.js');
      console.log('Service Worker registrado:', registro.scope);
    } catch (erro) {
      console.log('Erro ao registrar Service Worker:', erro);
    }
  }
}


async function carregarProdutos() {
  mostrarCarregamento(true);

  try {

  const resposta = await fetch(
    `${CONFIG.url_loja}/wp-json/wc/store/v1/products`
  );

    if (!resposta.ok) {
      throw new Error("Erro ao buscar produtos");
    }

    const produtosApi = await resposta.json();

    todos_os_produtos = produtosApi.map(produto => ({
      id: produto.id,
      name: produto.name,
      price: Number(produto.prices.price) / 100,
      description: produto.description,
      permalink: produto.permalink,
      images: produto.images,
      categories: produto.categories
    }));

    renderizarProdutos(todos_os_produtos);
    salvarProdutosNoCache(todos_os_produtos);

  } catch (erro) {
    console.error(erro);
    carregarProdutosDoCache();
  } finally {
    mostrarCarregamento(false);
  }
}


function renderizarProdutos(produtos) {
  const grade = document.getElementById('grade-produtos');
  const semProdutos = document.getElementById('sem-produtos');

  if (!produtos || produtos.length === 0) {
    grade.innerHTML = '';
    semProdutos.style.display = 'block';
    return;
  }

  semProdutos.style.display = 'none';

  grade.innerHTML = produtos.map(produto => {
    const temImagem = produto.images && produto.images.length > 0;
    const imagemHtml = temImagem
      ? `<img class="card-produto-imagem" src="${produto.images[0].src}" alt="${produto.name}" loading="lazy" />`
      : `<div class="card-produto-imagem-placeholder">💍</div>`;

    const preco = parseFloat(produto.price) || 0;
    const precoFormatado = preco.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });

    const categoria = produto.categories && produto.categories.length > 0
      ? produto.categories[0].name
      : 'Acessório';

    return `
      <div class="card-produto" onclick="abrirModal(${produto.id})">
        ${imagemHtml}
        <div class="card-produto-info">
          <p class="card-produto-categoria">${categoria}</p>
          <h3 class="card-produto-nome">${produto.name}</h3>
          <p class="card-produto-preco">${precoFormatado}</p>
          <button class="btn-adicionar" onclick="event.stopPropagation(); adicionarAoCarrinho(${produto.id})">
            + Adicionar ao carrinho
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function buscarProdutos() {
  const termoBusca = document.getElementById('campo-busca').value.toLowerCase();

  const produtosFiltrados = todos_os_produtos.filter(produto =>
    produto.name.toLowerCase().includes(termoBusca) ||
    (produto.description && produto.description.toLowerCase().includes(termoBusca))
  );

  renderizarProdutos(produtosFiltrados);
}

function filtrarCategoria(categoria) {
  const produtosFiltrados = todos_os_produtos.filter(produto => {
    if (!produto.categories) return false;
    return produto.categories.some(cat =>
      cat.name.toLowerCase().includes(categoria.toLowerCase()) ||
      cat.slug.toLowerCase().includes(categoria.toLowerCase())
    );
  });

  document.getElementById('produtos').scrollIntoView({ behavior: 'smooth' });
  renderizarProdutos(produtosFiltrados.length > 0 ? produtosFiltrados : todos_os_produtos);
}


function abrirModal(id_produto) {
  const produto = todos_os_produtos.find(p => p.id === id_produto);
  if (!produto) return;

  const preco = parseFloat(produto.price) || 0;
  const precoFormatado = preco.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  const temImagem = produto.images && produto.images.length > 0;
  const imagemHtml = temImagem
    ? `<img style="width:100%;height:220px;object-fit:cover;border-radius:8px;margin-bottom:16px;" src="${produto.images[0].src}" alt="${produto.name}" />`
    : `<div style="width:100%;height:120px;display:flex;align-items:center;justify-content:center;font-size:3rem;margin-bottom:16px;">💍</div>`;

  const descricao = produto.description
    ? produto.description.replace(/<[^>]*>/g, '').trim()
    : 'Produto elegante da Liê Accessories.';

  document.getElementById('modal-conteudo').innerHTML = `
    ${imagemHtml}
    <h2 class="modal-nome">${produto.name}</h2>
    <p class="modal-preco">${precoFormatado}</p>
    <p class="modal-descricao">${descricao.substring(0, 200)}${descricao.length > 200 ? '...' : ''}</p>
    <button class="btn-adicionar" onclick="adicionarAoCarrinho(${produto.id}); fecharModal()">
      + Adicionar ao carrinho
    </button>
  `;

  document.getElementById('overlay-modal').classList.add('ativo');
  document.getElementById('modal-produto').classList.add('ativo');
}

function fecharModal() {
  document.getElementById('overlay-modal').classList.remove('ativo');
  document.getElementById('modal-produto').classList.remove('ativo');
}


let nonceCache = null;

async function getNonce() {
  if (nonceCache) return nonceCache;

  const resposta = await fetch(`${CONFIG.url_loja}/wp-json/wc/store/v1/cart`, {
    credentials: 'include'
  });

  nonceCache = resposta.headers.get('Nonce');
  return nonceCache;
}

async function adicionarAoCarrinhoWoo(id_produto, quantidade) {
  try {
    const resposta = await fetch(`${CONFIG.url_loja}/wp-json/wc/store/v1/cart/add-item`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Nonce': await getNonce(),
      },
      body: JSON.stringify({
        id: id_produto,
        quantity: quantidade
      })
    });

    if (!resposta.ok) throw new Error('Erro ao adicionar no carrinho WooCommerce');

    return await resposta.json();
  } catch (erro) {
    console.error('Erro ao sincronizar carrinho:', erro);
  }
}

async function adicionarAoCarrinho(id_produto) {
  const produto = todos_os_produtos.find(p => p.id === id_produto);
  if (!produto) return;

  const itemExistente = carrinho.find(item => item.id === id_produto);

  if (itemExistente) {
    itemExistente.quantidade += 1;
  } else {
    carrinho.push({
      id: produto.id,
      nome: produto.name,
      preco: parseFloat(produto.price) || 0,
      quantidade: 1,
    });
  }

  atualizarCarrinho();
  mostrarFeedback('Produto adicionado ao carrinho! ');

  await adicionarAoCarrinhoWoo(id_produto, 1);

  salvarCarrinhoNoStorage();
}

async function removerDoCarrinhoWoo(woo_key) {
  try {
    const resposta = await fetch(`${CONFIG.url_loja}/wp-json/wc/store/v1/cart/remove-item`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Nonce': await getNonce(),
      },
      body: JSON.stringify({ key: woo_key })
    });

    if (!resposta.ok) throw new Error('Erro ao remover do carrinho WooCommerce');
  } catch (erro) {
    console.error('Erro ao remover do carrinho WooCommerce:', erro);
  }
}

function removerDoCarrinho(id_produto) {
  const item = carrinho.find(item => item.id === id_produto);
  if (item && item.woo_key) removerDoCarrinhoWoo(item.woo_key);

  carrinho = carrinho.filter(item => item.id !== id_produto);
  atualizarCarrinho();
  salvarCarrinhoNoStorage();
}

function atualizarCarrinho() {
  const totalItens = carrinho.reduce((soma, item) => soma + item.quantidade, 0);
  document.getElementById('quantidade-carrinho').textContent = totalItens;

  const containerItens = document.getElementById('carrinho-itens');

  if (carrinho.length === 0) {
    containerItens.innerHTML = '<p class="carrinho-vazio">Seu carrinho está vazio.</p>';
    document.getElementById('total-carrinho').textContent = 'R$ 0,00';
    return;
  }

  containerItens.innerHTML = carrinho.map(item => {
    const subtotal = (item.preco * item.quantidade).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
    return `
      <div class="item-carrinho">
        <div class="item-carrinho-nome">${item.nome} <small>x${item.quantidade}</small></div>
        <div class="item-carrinho-preco">${subtotal}</div>
        <button class="item-carrinho-remover" onclick="removerDoCarrinho(${item.id})">✕</button>
      </div>
    `;
  }).join('');

  const total = carrinho.reduce((soma, item) => soma + (item.preco * item.quantidade), 0);
  document.getElementById('total-carrinho').textContent = total.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function abrirCarrinho() {
  document.getElementById('overlay-carrinho').classList.add('ativo');
  document.getElementById('painel-carrinho').classList.add('ativo');
}

function fecharCarrinho() {
  document.getElementById('overlay-carrinho').classList.remove('ativo');
  document.getElementById('painel-carrinho').classList.remove('ativo');
}

async function limparCarrinhoWoo() {
  nonceCache = null;
  await fetch(`${CONFIG.url_loja}/wp-json/wc/store/v1/cart/items`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Nonce': await getNonce(),
    }
  });
  nonceCache = null;
}

async function finalizarCompra() {
  if (carrinho.length === 0) {
    alert('Seu carrinho está vazio!');
    return;
  }

  mostrarFeedback('Preparando seu pedido...');

  try {
    await limparCarrinhoWoo();

    for (const item of carrinho) {
      await fetch(`${CONFIG.url_loja}/wp-json/wc/store/v1/cart/add-item`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Nonce': await getNonce(),
        },
        body: JSON.stringify({
          id: item.id,
          quantity: item.quantidade
        })
      });
    }

    window.location.href = `${CONFIG.url_loja}/checkout`;
  } catch (erro) {
    console.error('Erro ao sincronizar carrinho:', erro);
    mostrarFeedback('Erro ao preparar pedido. Tente novamente.');
  }
}

function salvarCarrinhoNoStorage() {
  localStorage.setItem('carrinho_lie', JSON.stringify(carrinho));
}

function carregarCarrinhoDoStorage() {
  const carrinhoSalvo = localStorage.getItem('carrinho_lie');
  if (carrinhoSalvo) {
    carrinho = JSON.parse(carrinhoSalvo);
    atualizarCarrinho();
  }
}

function salvarProdutosNoCache(produtos) {
  localStorage.setItem('produtos_cache_lie', JSON.stringify(produtos));
  localStorage.setItem('produtos_cache_data', new Date().toISOString());
}

function carregarProdutosDoCache() {
  const cache = localStorage.getItem('produtos_cache_lie');
  if (cache) {
    const produtos = JSON.parse(cache);
    todos_os_produtos = produtos;
    renderizarProdutos(produtos);
    mostrarFeedback(' Exibindo produtos salvos (modo offline)');
  } else {
    mostrarCarregamento(false);
    document.getElementById('sem-produtos').style.display = 'block';
  }
}


function verificarConexao() {
  const aviso = document.getElementById('aviso-offline');

  window.addEventListener('offline', () => {
    aviso.classList.add('visivel');
  });

  window.addEventListener('online', () => {
    aviso.classList.remove('visivel');
    carregarProdutos();
  });

  if (!navigator.onLine) {
    aviso.classList.add('visivel');
  }
}


function configurarBotaoInstalar() {
  window.addEventListener('beforeinstallprompt', (evento) => {
    evento.preventDefault();
    evento_instalacao = evento;
    document.getElementById('btn-instalar').style.display = 'block';
  });

  window.addEventListener('appinstalled', () => {
    document.getElementById('btn-instalar').style.display = 'none';
    mostrarFeedback('App instalado com sucesso! ');
  });
}

function instalarApp() {
  if (!evento_instalacao) return;
  evento_instalacao.prompt();
  evento_instalacao.userChoice.then(resultado => {
    if (resultado.outcome === 'accepted') {
      console.log('Usuário aceitou instalar o app');
    }
    evento_instalacao = null;
  });
}


function mostrarCarregamento(mostrar) {
  document.getElementById('status-carregamento').style.display = mostrar ? 'block' : 'none';
}

function mostrarFeedback(mensagem) {
  const feedback = document.createElement('div');
  feedback.style.cssText = `
    position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
    background: #2c3e3e; color: white; padding: 12px 24px;
    border-radius: 30px; font-size: 0.85rem; z-index: 999;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2); font-family: 'Lato', sans-serif;
  `;
  feedback.textContent = mensagem;
  document.body.appendChild(feedback);
  setTimeout(() => feedback.remove(), 3000);
}