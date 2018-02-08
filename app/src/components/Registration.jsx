// @flow
import React, { Component } from 'react';
import competitionAbi from '../contracts/Competition.json';

const competitionAddress = '0x5652AC06E148b8c8d86c2C040fdBbbF98860ef47';
const melonToken = '0xBEB9eF514a379B997e0798FDcC901Ee474B6D9A1';
// const TERMS_AND_CONDITIONS = '0x1a46b45cc849e26bb3159298c3c218ef300d015ed3e23495e77f0e529ce9f69e';

class Registration extends Component {
  constructor(props) {
    super(props);
    this.state = { loading: 0, contract: '', payoutAddress: '' };
    this.handleNext = this.handleNext.bind(this);
    this.handleBack = this.handleBack.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.interval = null;
  }

  async componentWillMount() {
    const contract = await new this.props.web3.eth.Contract(competitionAbi, competitionAddress);
    this.setState({ contract });
    this.setState({ payoutAddress: this.props.account });
    // Interval started from this point itself to check if user has already registered before
    this.interval = setInterval(this.checkCompeting.bind(this), 1000);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  /*
  async sign() {
    let hash = TERMS_AND_CONDITIONS;
    let sig = await this.props.web3.eth.sign(hash, this.props.account);
    sig = sig.substr(2, sig.length);
    const r = `0x${sig.substr(0, 64)}`;
    const s = `0x${sig.substr(64, 64)}`;
    const v = parseFloat(sig.substr(128, 2)) + 27;
    return { r, s, v };
  }
  */

  async handleNext(event) {
    event.preventDefault();
    try {
      //const { r, s, v } = await this.sign();
      this.setState({ loading: 1 });
      await this.state.contract.methods
        .registerForCompetition(
          this.props.fundAddress,
          this.props.manager,
          melonToken,
          melonToken,
          this.state.payoutAddress,
          0,
          this.props.v,
          this.props.r,
          this.props.s,
        )
        .send({ from: this.props.account });
    } catch (err) {
      console.log(err);
      this.props.updateState('errorMessage', 'Registration Failed. Try again');
      this.setState({ loading: 0 });
    }
  }

  handleBack(event) {
    event.preventDefault();
    this.props.updateState('step', 1);
  }

  handleChange(event) {
    this.setState({ payoutAddress: event.target.value });
  }

  // Check if the registration has been attested and user is Competing
  async checkCompeting() {
    // To avoid crashes from weird web3 exceptions
    try {
      const hopefulId = await this.state.contract.methods
        .registrantToHopefulIds(this.props.account)
        .call({ from: this.props.account });
      // Check for valid mapping
      if (hopefulId.exists === true) {
        const hopeful = await this.state.contract.methods
          .hopefuls(hopefulId.id)
          .call({ from: this.props.account });
        if (hopeful.isCompeting === true) {
          this.setState({ loading: 0 });
          this.props.updateState('step', 3);
        }
      }
    } catch (err) {
      // Ignore
    }
  }

  render() {
    return (
      <form onSubmit={this.handleNext}>
        {this.state.loading === 1 && (
          <div className="alert alert-info" role="alert">
            <b>Please wait</b>, your registration is being processed
          </div>
        )}
        <b>Fund Address : {this.props.fundAddress}</b>
        <br />
        <br />
        <b>Payout Address</b>:{' '}
        <input
          type="text"
          id="payout"
          className="form-control"
          name="payout"
          value={this.state.payoutAddress}
          onChange={this.handleChange}
          required
        />
        <br />
        <input type="submit" className="btn btn-info" value="Submit" />
        <input type="button" onClick={this.handleBack} className="btn btn-secondary" value="Back" />
      </form>
    );
  }
}

export default Registration;
