import React, { useEffect, useState } from "react";
import { useWriteContract, useWalletClient, usePublicClient } from "wagmi";
import { ensNameWrapperABI } from "../network/ensNameWrapperABI";
import { keccak256, namehash } from "viem";
import { addresses } from "../network/addresses";
import { makeid } from "../utils";
import { Button, Progress, Input } from "@nextui-org/react";
import { useIndexedDB } from "react-indexed-db-hook";
import {useSendRefer} from "../hooks/useSendRefer";
import { generateProof } from "../circuit";

interface Props {
  // Define your component's props here
}

const convertToBytes = (input: string) => new Uint8Array(Buffer.from(input, 'hex'));

const Home: React.FC<Props> = () => {
  const db = useIndexedDB("worldcoin");
  const dbReferrals = useIndexedDB("referrals");
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { writeContract } = useWriteContract();
  const [submitting, setSubmitting] = React.useState(false);
  const [subStep, setSubStep] = React.useState(0);
  const [hasEntry, setHasEntry] = useState(false);
  const [worldcoinEntry, setWorldcoinEntry] = useState(null);
  const [rootHash, setRootHash] = useState<string>("");
  const [referralCodes, setReferralCodes] = useState<string[]>([]);
  const [referralCodeInput, setReferralCodeInput] = useState<string>("");
  const [usingReferral, setUsingReferral] = useState(false);
  const callSendRefer = useSendRefer();

  useEffect(() => {
    db.getAll().then((wc) => {
      setHasEntry(wc.length > 0);
      setWorldcoinEntry(wc[0]);
      setRootHash(wc[0]?.merkle_root);
    });
    dbReferrals.getAll().then((ref) => {
      setReferralCodes(ref.map((r) => r.code));
    });
  }, []);

  if (!hasEntry) {
    return <p>You have not verified World ID</p>;
  }

  const handleUseReferral = async () => {
    if (!worldcoinEntry) {
      return;
    }
    setUsingReferral(true);
    // generate proof

    const originalReferral = referralCodeInput+'0000000000';
    const hashedReferral = keccak256(originalReferral as `0x${string}`);

    console.log(Array.from(convertToBytes(originalReferral)).length);

    const { proof, publicInputs } = await generateProof({
      x: Array.from(convertToBytes(originalReferral)),
      result: Array.from(convertToBytes(hashedReferral)),
    });

    // call contract

    await callSendRefer(
      'hoge',
      worldcoinEntry,
      publicInputs,
      proof
    )
  }

  const handleSubmit = () => {
    setSubmitting(true);
    const key = "worldcoin";
    const value = rootHash;
    //
    const referralCode = makeid(6);
    //
    const parentNode = namehash("cat.eth");
    const node = namehash(`${referralCode}.cat.eth`);
    //
    writeContract(
      {
        abi: ensNameWrapperABI,
        address: addresses.ensResolverWrapper,
        functionName: "setSubnodeRecord",
        args: [
          addresses.nameWrapper,
          parentNode,
          referralCode,
          addresses.ensNameOwnerAddress,
          addresses.ensResolver,
          0n,
          0,
          0n,
        ],
        account: walletClient!.account,
      },
      {
        onSettled: async (data) => {
          await publicClient!.waitForTransactionReceipt({
            hash: data!,
          });
          setSubStep(1);

          writeContract(
            {
              abi: ensNameWrapperABI,
              address: addresses.ensResolverWrapper,
              functionName: "setText",
              args: [addresses.ensResolver, node, key, value],
              account: walletClient!.account,
            },
            {
              onSettled: async (data) => {
                await publicClient!.waitForTransactionReceipt({
                  hash: data!,
                });
                dbReferrals.add({ code: referralCode });
                setSubmitting(false);
                setSubStep(0);
              },
              onError: () => {
                setSubmitting(false);
                setSubStep(0);
              },
            }
          );
        },
        onError: () => {
          setSubmitting(false);
          setSubStep(0);
        },
      }
    );
  };

  return (
    <div
      style={{
        margin: "3%",
      }}
    >
      <h1 style={{ fontSize: 19 }}>Generate Referral</h1>
      <Button
        color="primary"
        isLoading={submitting}
        disabled={submitting}
        onClick={handleSubmit}
      >
        Generate
      </Button>
      {referralCodes.length > 0 && (
        <>
          <br />
          <br />
          <h1 style={{ fontSize: 19 }}>Referral Codes</h1>
        </>
      )}
      <ul>
        {referralCodes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      {submitting && (
        <>
          <br />
          <br />
          <Progress
            isStriped
            aria-label="Loading..."
            color="secondary"
            value={subStep * 50}
            className="max-w-md"
          />
        </>
      )}
      <br />
      <br />
      <h1 style={{ fontSize: 19 }}>Use Referral</h1>
      <Input type="text" label="Referral" value={referralCodeInput} onChange={(e) => setReferralCodeInput(e.target.value)} placeholder="Use a referral code" />
      <Button
        color="primary"
        isLoading={usingReferral}
        disabled={usingReferral}
        onClick={handleUseReferral}
      >
        Use Referral
      </Button>
    </div>
  );
};

export default Home;
