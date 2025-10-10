import SwapFactory from 0xb063c16cac85dbd1
import SwapInterfaces from 0xb78ef7afa52ff906
import SwapConfig from 0xb78ef7afa52ff906

/// Check if FLOW/USDC pair exists on mainnet and get pair info
access(all) fun main(): {String: AnyStruct} {
    let flowKey = "A.1654653399040a61.FlowToken"
    let usdcKey = "A.b19436aae4d94622.FiatToken"

    let pairAddr = SwapFactory.getPairAddress(
        token0Key: flowKey,
        token1Key: usdcKey
    )

    if pairAddr == nil {
        return {
            "exists": false,
            "message": "FLOW/USDC pair does not exist"
        }
    }

    let pairRef = getAccount(pairAddr!)
        .capabilities.borrow<&{SwapInterfaces.PairPublic}>(
            SwapConfig.PairPublicPath
        )!

    let pairInfo = pairRef.getPairInfo()

    return {
        "exists": true,
        "pairAddress": pairAddr!.toString(),
        "token0": pairInfo[0] as! String,
        "token1": pairInfo[1] as! String,
        "reserve0": pairInfo[2] as! UFix64,
        "reserve1": pairInfo[3] as! UFix64,
        "message": "✅ FLOW/USDC pair exists with liquidity"
    }
}
