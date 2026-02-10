import React, { useEffect } from "react";
import Page from "../components/Page";
import { SmallButton } from "../components/routesUi";
import ConnectionsCard from "../components/profile/ConnectionsCard";
import { usePartnerConnections } from "../hooks/usePartnerConnections";

export default function ProfileScreen({ session, supabase }) {
  const userId = session?.user?.id;

  const {
    connLoading,
    connErr,
    connOk,
    connections,
    partnerProfilesById,
    incomingRequests,
    outgoingRequests,
    partnerQuery,
    partnerSearchBusy,
    partnerResults,
    partnerSearchRawCount,
    setPartnerQuery,
    loadConnections,
    doSearchPartners,
    sendRequest,
    acceptRequest,
    revokeLink,
    helpers,
  } = usePartnerConnections({ supabase, userId });

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  return (
    <Page>
      <ConnectionsCard
        SmallButton={SmallButton}
        userId={userId}
        connLoading={connLoading}
        connErr={connErr}
        connOk={connOk}
        connections={connections}
        partnerProfilesById={partnerProfilesById}
        incomingRequests={incomingRequests}
        outgoingRequests={outgoingRequests}
        partnerQuery={partnerQuery}
        partnerSearchBusy={partnerSearchBusy}
        partnerResults={partnerResults}
        partnerSearchRawCount={partnerSearchRawCount}
        setPartnerQuery={setPartnerQuery}
        loadConnections={loadConnections}
        doSearchPartners={doSearchPartners}
        sendRequest={sendRequest}
        acceptRequest={acceptRequest}
        revokeLink={revokeLink}
        helpers={helpers}
      />

      <div style={{ marginTop: 20 }}>
        <SmallButton tone="danger" onClick={() => supabase.auth.signOut()}>
          Sign out
        </SmallButton>
      </div>
    </Page>
  );
}