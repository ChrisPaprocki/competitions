// @flow
import React, { Component } from 'react';
import simpleCertifierAbi from '../contracts/SimpleCertifier.json';

const certifierAddress = '0x19d9d9d2066753f0929b51b64643a5ef899a6d3c';

class KYCVerification extends Component {
  constructor(props) {
    super(props);
    this.state = { contract: '' };
    // this.handleBack = this.handleBack.bind(this);
    this.interval = null;
  }

  async componentWillMount() {
    const contract = await new this.props.web3.eth.Contract(simpleCertifierAbi, certifierAddress);
    this.setState({ contract });
    this.interval = setInterval(this.checkVerified.bind(this), 1000);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  async checkVerified() {
    const verified = await this.state.contract.methods
      .certified(this.props.account)
      .call();
    if (verified === true) {
      this.props.updateState('step', 2);
    }
  }

  /*
  handleBack(event) {
    event.preventDefault();
    this.props.updateState('step', 1);
  }
  */

  render() {
    return (
      <form onSubmit={this.handleNext}>
        <h3>Whitelist Verification</h3>
        <div>
          <label htmlFor="number"><b>Status:</b> <span className="red-text">Not Verified</span></label>
        </div>
        <p>Please wait a few seconds if you are already on the whitelist</p>
        {/* <input type="button" onClick={this.handleBack} className="btn btn-secondary" value="Back" /> */}
      </form>
    );
  }
}

export default KYCVerification;
