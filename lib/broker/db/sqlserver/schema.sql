IF OBJECT_ID('instances') IS NULL
BEGIN
  CREATE TABLE instances (azureInstanceId varchar(256) NOT NULL UNIQUE, status varchar(18), timestamp DATETIME DEFAULT (GETDATE()), instanceId char(36) PRIMARY KEY, serviceId char(36) NOT NULL, planId char(36) NOT NULL, organizationGuid char(36) NOT NULL, spaceGuid char(36) NOT NULL, parameters text, lastOperation text, provisioningResult text);
END

IF OBJECT_ID('bindings') IS NULL
BEGIN
  CREATE TABLE bindings (bindingId char(36) PRIMARY KEY, instanceId char(36) FOREIGN KEY REFERENCES instances(instanceId), timestamp DATETIME DEFAULT (GETDATE()), serviceId char(36) NOT NULL, planId char(36) NOT NULL, parameters text, bindingResult text);
END
