"use client";

import React, { useState } from "react";
import ReportIssue from "./ReportIssue";
import IssuesListInfinite from "./IssuesListInfinite";
import { Button } from "../ui/button";
import { useUserStore } from "../../store/userStore";

const IssuesPage = () => {
  const [activeTab, setActiveTab] = useState("list");
  const [refreshList, setRefreshList] = useState(false);

  const { user } = useUserStore();

  const handleIssueCreated = (newIssue) => {
    // Switch to list view and refresh the list
    setActiveTab("list");
    setRefreshList((prev) => !prev);
  };

  const isConsumer = user?.role === "consumer";

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b">
        <Button
          onClick={() => setActiveTab("list")}
          variant={activeTab === "list" ? "default" : "ghost"}
          className="mb-2"
        >
          All Issues
        </Button>

        {isConsumer && (
          <>
            <Button
              onClick={() => setActiveTab("my-issues")}
              variant={activeTab === "my-issues" ? "default" : "ghost"}
              className="mb-2"
            >
              My Issues
            </Button>
            <Button
              onClick={() => setActiveTab("report")}
              variant={activeTab === "report" ? "default" : "ghost"}
              className="mb-2"
            >
              Report Issue
            </Button>
          </>
        )}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "list" && (
          <IssuesListInfinite
            key={`all-${refreshList}`}
            showUserIssuesOnly={false}
            useInfiniteScrolling={true}
          />
        )}

        {activeTab === "my-issues" && isConsumer && (
          <IssuesListInfinite
            key={`my-${refreshList}`}
            showUserIssuesOnly={true}
            useInfiniteScrolling={true}
          />
        )}

        {activeTab === "report" && isConsumer && (
          <ReportIssue onIssueCreated={handleIssueCreated} />
        )}
      </div>

      {/* Quick Actions */}
      {isConsumer && activeTab !== "report" && (
        <div className="fixed bottom-6 right-6">
          <Button
            onClick={() => setActiveTab("report")}
            className="rounded-full w-14 h-14 shadow-lg"
            size="lg"
          >
            <span className="text-2xl">+</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default IssuesPage;
