import { utils } from 'ethers';
import { DAI } from '../../eth/Currency';

export default class OasisOrder {
  fillAmount() {
    return this._fillAmount;
  }

  fees() {
    return this._txMgr.getTransaction(this.promise).fees();
  }

  created() {
    return this._txMgr.getTransaction(this.promise).timestamp();
  }

  transact(contract, method, args, transactionManager) {
    this._contract = contract;
    this._txMgr = transactionManager;
    const promise = (async () => {
      await 0;
      const txo = await contract[method](...[...args, { promise }]);
      this._parseLogs(txo.receipt.logs);
      return this;
    })();
    this.promise = promise;
    return promise;
  }

  _parseLogs(logs) {
    const { LogTrade } = this._contract.interface.events;

    // TODO convert string to hex without web3
    const topic = utils.keccak256(
      this._txMgr.get('web3')._web3.toHex(LogTrade.signature)
    );

    const receiptEvents = logs.filter(
      e =>
        e.topics[0].toLowerCase() === topic.toLowerCase() &&
        e.address.toLowerCase() === this._contract.address.toLowerCase()
    );

    const total = receiptEvents.reduce((acc, event) => {
      const parsedLog = LogTrade.parse(event.data);
      return acc.add(parsedLog[this._logKey]);
    }, utils.bigNumberify('0'));
    this._fillAmount = this._unit.wei(total.toString());
  }
}

export class OasisBuyOrder extends OasisOrder {
  constructor() {
    super();
    this._logKey = 'buy_amt';
    this._unit = DAI;
  }

  static build(contract, method, args, transactionManager) {
    const order = new OasisBuyOrder();
    order.transact(contract, method, args, transactionManager);
    return order.promise;
  }
}

export class OasisSellOrder extends OasisOrder {
  constructor(currency) {
    super();
    this._logKey = 'pay_amt';
    this._unit = currency;
  }

  static build(contract, method, args, transactionManager, currency) {
    const order = new OasisSellOrder(currency);
    order.transact(contract, method, args, transactionManager);
    return order.promise;
  }
}
