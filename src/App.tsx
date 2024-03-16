import { useAccount, useDisconnect } from "wagmi";
import { useWeb3Modal } from "@web3modal/wagmi/react";
import ENSNameWrapper from "./components/ens";
import { WorldIdWidget } from "./components/WorldIDWidget";
import { Tabs, Tab } from "@nextui-org/react";
import { useState } from "react";

function App() {
  const account = useAccount();
  const { open } = useWeb3Modal();
  const { disconnect } = useDisconnect();
  const [selected, setSelected] = useState("Home");

  return (
    <div>
      <div
        style={{
          height: 150,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#ffe8d6",
        }}
      >
        <h2>DeRef</h2>
        <Tabs
          variant="underlined"
          aria-label="Tabs variants"
          selectedKey={selected}
          onSelectionChange={(k) => setSelected(k.toString())}
        >
          <Tab key="Home" title="Home" />
          {account.status === "connected" && (
            <Tab key="Profile" title="Profile" />
          )}
        </Tabs>
      </div>
      {account.status === "connected" ? (
        selected === "Home" ? (
          <ENSNameWrapper />
        ) : (
          <>
            <WorldIdWidget signal="hoge" />
            <button onClick={() => disconnect()}>Disconnect</button>
          </>
        )
      ) : (
        <button onClick={() => open()}>Connect</button>
      )}
    </div>
  );
}

export default App;
