import { config } from "dotenv"
import { IBundler, Bundler } from '@biconomy/bundler'
import { BiconomySmartAccount, BiconomySmartAccountConfig, DEFAULT_ENTRYPOINT_ADDRESS } from "@biconomy/account"
import { Wallet, providers, ethers  } from 'ethers'
import { ChainId } from "@biconomy/core-types"
import { 
  IPaymaster, 
  BiconomyPaymaster,  
  IHybridPaymaster,
  PaymasterFeeQuote,
  PaymasterMode,
  SponsorUserOperationDto, 
} from '@biconomy/paymaster'


config()

const bundler: IBundler = new Bundler({
  bundlerUrl: 'https://bundler.biconomy.io/api/v2/80001/abc', // you can get this value from biconomy dashboard.     
  chainId: ChainId.POLYGON_MUMBAI,
  entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
})

const paymaster: IPaymaster = new BiconomyPaymaster({
  paymasterUrl: 'https://paymaster.biconomy.io/api/v1/80001/Tpk8nuCUd.70bd3a7f-a368-4e5a-af14-80c7f1fcda1a' 
})

const provider = new providers.JsonRpcProvider("https://rpc.ankr.com/polygon_mumbai")
const wallet = new Wallet(process.env.PRIVATE_KEY || "", provider);

const biconomySmartAccountConfig: BiconomySmartAccountConfig = {
  signer: wallet,
  chainId: ChainId.POLYGON_MUMBAI,
  bundler: bundler,
  paymaster: paymaster
}

async function createAccount() {
  let biconomySmartAccount = new BiconomySmartAccount(biconomySmartAccountConfig)
  biconomySmartAccount =  await biconomySmartAccount.init()
  console.log("owner: ", biconomySmartAccount.owner)
  console.log("address: ", await biconomySmartAccount.getSmartAccountAddress())
  // code below is if you want to see balances of all of your tokens
  // console.log("balances: ", await biconomySmartAccount.getAllTokenBalances({ chainId: ChainId.POLYGON_MUMBAI, eoaAddress: biconomySmartAccount.owner, tokenAddresses:[]}))
  return biconomySmartAccount;
}

// createAccount()

// async function createTransaction() {
//   console.log("creating account")

//   const smartAccount = await createAccount();

//   const transaction = {
//     to: '0x322Af0da66D00be980C7aa006377FCaaEee3BDFD',
//     data: '0x',
//     value: ethers.utils.parseEther('0.1'),
//   }
//   console.log("building userop")
//   const userOp = await smartAccount.buildUserOp([transaction])
//   userOp.paymasterAndData = "0x"

//   const userOpResponse = await smartAccount.sendUserOp(userOp)

//   const transactionDetail = await userOpResponse.wait()

//   console.log("transaction detail below")
//   console.log(transactionDetail)
// }

// createTransaction()

async function mintNFT() {
  const smartAccount = await createAccount();

  const nftInterface = new ethers.utils.Interface([
    "function safeMint(address _to)",
  ]);

  const scwAddress = await smartAccount.getSmartAccountAddress();

  const data = nftInterface.encodeFunctionData("safeMint", [scwAddress]);

  const nftAddress = "0x1758f42Af7026fBbB559Dc60EcE0De3ef81f665e";

  const transaction = {
    to: nftAddress,
    data: data,
  };

  let partialUserOp = await smartAccount.buildUserOp([transaction, transaction]);

  const biconomyPaymaster =
  smartAccount.paymaster as IHybridPaymaster<SponsorUserOperationDto>;

  let paymasterServiceData: SponsorUserOperationDto = {
      mode: PaymasterMode.SPONSORED,
  };

  try {
  const paymasterAndDataResponse =
    await biconomyPaymaster.getPaymasterAndData(
      partialUserOp,
      paymasterServiceData
    );
    partialUserOp.paymasterAndData = paymasterAndDataResponse.paymasterAndData;
  } catch (e) {
  console.log("error received ", e);
  }

  try {
    const userOpResponse = await smartAccount.sendUserOp(partialUserOp);
    console.log(`userOp Hash: ${userOpResponse.userOpHash}`);
    const transactionDetails = await userOpResponse.wait();
    console.log(
        `transactionDetails: ${JSON.stringify(transactionDetails.logs[0].transactionHash, null, "\t")}`
      )
    } catch (e) {
      console.log("error received ", e);
    }
  };

  async function mintNFTUSDC() {
    const smartAccount = await createAccount();
  
    const nftInterface = new ethers.utils.Interface([
      "function safeMint(address _to)",
    ]);
  
    const scwAddress = await smartAccount.getSmartAccountAddress();
  
    const data = nftInterface.encodeFunctionData("safeMint", [scwAddress]);
  
    const nftAddress = "0x1758f42Af7026fBbB559Dc60EcE0De3ef81f665e";
  
    const transaction = {
      to: nftAddress,
      data: data,
    };
  
    let partialUserOp = await smartAccount.buildUserOp([transaction, transaction]);
    let finalUserOp = partialUserOp;

    const biconomyPaymaster =
    smartAccount.paymaster as IHybridPaymaster<SponsorUserOperationDto>;

  const feeQuotesResponse = await biconomyPaymaster.getPaymasterFeeQuotesOrData(partialUserOp, {
        mode: PaymasterMode.ERC20,
        tokenList:[],
      });

      const feeQuotes = feeQuotesResponse.feeQuotes as PaymasterFeeQuote[];
      const spender = feeQuotesResponse.tokenPaymasterAddress || "";
      const usdcFeeQuotes = feeQuotes[1]
      console.log(usdcFeeQuotes)

      finalUserOp = await smartAccount.buildTokenPaymasterUserOp(
        partialUserOp,
        {
          feeQuote: usdcFeeQuotes,
          spender: spender,
          maxApproval: false,
        }
      );

      let paymasterServiceData = {
        mode: PaymasterMode.ERC20,
        feeTokenAddress: usdcFeeQuotes.tokenAddress,
      };

      try{
        const paymasterAndDataWithLimits =
          await biconomyPaymaster.getPaymasterAndData(
            finalUserOp,
            paymasterServiceData
          );
        finalUserOp.paymasterAndData = paymasterAndDataWithLimits.paymasterAndData;
    
      } catch (e) {
        console.log("error received ", e);
      }

      try {
        const userOpResponse = await smartAccount.sendUserOp(finalUserOp);
        const transactionDetails = await userOpResponse.wait();
        console.log(
            `transactionDetails: ${JSON.stringify(transactionDetails.logs[0].transactionHash, null, "\t")}`
        );
        } catch (e) {
          console.log("error received ", e);
        }

    };

  mintNFTUSDC()