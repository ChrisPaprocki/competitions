// @flow
/* eslint-disable */
import React from 'react';
import ReactDOM from 'react-dom';
import Web3 from 'web3';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

window.addEventListener('load', async () => {
  try {
    let web3Provided;
    if (typeof web3 !== 'undefined') {
      web3Provided = new Web3(web3.currentProvider);
    } else {
      web3Provided = new Web3(new Web3.providers.HttpProvider('https://localhost:8545'));
    }
    const accounts = await web3Provided.eth.getAccounts();

    ReactDOM.render(
      <App web3={web3Provided} account={accounts[0]} />,
      document.getElementById('root'),
    );
  }
  catch (e) {
    ReactDOM.render(
      <div className="home-error">
       <h2>Please connect to Metamask main network</h2>
       <p>To register in our competition, you need to use a main net account on Metamask, Please make sure you have Metamask installed and set on main network.</p>
      </div>,
      document.getElementById('root'),
    );
  }
});
