use tauri::State;
use tonic::Request;

use crate::state::AppState;
use mycel_sdk::proto::{
    admin::v1::{GetTemplateRequest, ListTemplatesRequest},
    client::v1::{PropertyType, Template, TemplateProperty, TemplateState},
};

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListTemplatesInput {
    pub space_id: String,
    pub page_size: Option<i32>,
    pub page_token: Option<String>,
    pub include_archived: Option<bool>,
    pub include_system: Option<bool>,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetTemplateInput {
    pub space_id: String,
    pub template_id: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListTemplatesResponse {
    pub templates: Vec<TemplateInfo>,
    pub next_page_token: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplateInfo {
    pub template_id: String,
    pub space_id: String,
    pub key: String,
    pub version: String,
    pub display_name: Option<String>,
    pub description: Option<String>,
    pub system: bool,
    pub state: String,
    pub properties_allow_extra: bool,
    pub properties_forbidden: Vec<String>,
    pub properties: Vec<TemplatePropertyInfo>,
    pub create_time: Option<String>,
    pub update_time: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TemplatePropertyInfo {
    pub name: String,
    pub value_type: String,
    pub required: bool,
    pub description: Option<String>,
}

#[tauri::command]
pub async fn admin_list_templates(
    input: ListTemplatesInput,
    state: State<'_, AppState>,
) -> Result<ListTemplatesResponse, String> {
    if input.space_id.trim().is_empty() {
        return Err("Space ID is required".to_string());
    }
    let mut client = template_client(&state).await?;
    let response = client
        .list_templates(Request::new(ListTemplatesRequest {
            space_id: input.space_id.trim().to_string(),
            page_size: input.page_size.unwrap_or(100),
            page_token: input.page_token.unwrap_or_default(),
            include_archived: input.include_archived.unwrap_or(false),
            include_system: input.include_system.unwrap_or(false),
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(ListTemplatesResponse {
        templates: response.templates.into_iter().map(template_info).collect(),
        next_page_token: optional(response.next_page_token),
    })
}

#[tauri::command]
pub async fn admin_get_template(
    input: GetTemplateInput,
    state: State<'_, AppState>,
) -> Result<TemplateInfo, String> {
    if input.space_id.trim().is_empty() {
        return Err("Space ID is required".to_string());
    }
    if input.template_id.trim().is_empty() {
        return Err("Template ID is required".to_string());
    }
    let mut client = template_client(&state).await?;
    let response = client
        .get_template(Request::new(GetTemplateRequest {
            space_id: input.space_id.trim().to_string(),
            template_id: input.template_id.trim().to_string(),
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    response
        .template
        .map(template_info)
        .ok_or_else(|| "Template not found".to_string())
}

async fn template_client(
    state: &State<'_, AppState>,
) -> Result<
    mycel_sdk::proto::admin::v1::admin_template_service_client::AdminTemplateServiceClient<
        mycel_sdk::admin::AuthenticatedService,
    >,
    String,
> {
    let guard = state.admin.read().await;
    let session = guard.as_ref().ok_or_else(|| "Not logged in".to_string())?;
    Ok(session._client.templates.clone())
}

fn template_info(template: Template) -> TemplateInfo {
    let props = template.properties.unwrap_or_default();
    TemplateInfo {
        template_id: template.template_id,
        space_id: template.space_id,
        key: template.key,
        version: template.version,
        display_name: optional(template.display_name),
        description: optional(template.description),
        system: template.system,
        state: template_state(template.state),
        properties_allow_extra: props.allow_extra,
        properties_forbidden: props.forbidden,
        properties: props.allowed.into_iter().map(property_info).collect(),
        create_time: None,
        update_time: None,
    }
}

fn property_info(prop: TemplateProperty) -> TemplatePropertyInfo {
    TemplatePropertyInfo {
        name: prop.name,
        value_type: property_type(prop.r#type),
        required: prop.required,
        description: optional(prop.description),
    }
}

fn template_state(value: i32) -> String {
    match TemplateState::try_from(value).unwrap_or(TemplateState::Unspecified) {
        TemplateState::Active => "active",
        TemplateState::Archived => "archived",
        TemplateState::Unspecified => "unspecified",
    }
    .to_string()
}
fn property_type(value: i32) -> String {
    match PropertyType::try_from(value).unwrap_or(PropertyType::Unspecified) {
        PropertyType::String => "string",
        PropertyType::Number => "number",
        PropertyType::Bool => "bool",
        PropertyType::Object => "object",
        PropertyType::Array => "array",
        PropertyType::Date => "date",
        PropertyType::Unspecified => "unspecified",
    }
    .to_string()
}
fn optional(value: String) -> Option<String> {
    if value.trim().is_empty() {
        None
    } else {
        Some(value)
    }
}
